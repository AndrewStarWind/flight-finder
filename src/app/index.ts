import * as express from 'express';
import * as morgan from 'morgan';

import { notNil, flatten } from '../util';
import { Airport, loadAirportData, loadRouteData, Route, ConnectedAirport } from '../data';
import { getShortestPath, PathResult, constructGraph, isFoundPathResult } from '../util/pathFinder';

export async function createApp() {
  const app = express();
  const airports: Airport[] = await loadAirportData();
  const airportsByCode = new Map<string, Airport>(
    flatten(airports.map((airport) => [
      airport.iata !== null ? [airport.iata.toLowerCase(), airport] as const : null,
      airport.icao !== null ? [airport.icao.toLowerCase(), airport] as const : null,
    ].filter(notNil)))
  );

  // TODO: the graph should be updated on data change
  const flights: Route[] = await loadRouteData();
  const graph = constructGraph(airports, flights);

  app.use(morgan('tiny'));

  app.get('/health', (_, res) => res.send('OK'));
  app.get('/airports/:code', (req, res) => {
    const code = req.params['code'];
    if (code === undefined) {
      return res.status(400).send('Must provide airport code');
    }

    const airport = airportsByCode.get(code.toLowerCase());
    if (airport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO code');
    }

    return res.status(200).send(airport);
  });


  // TODO: some memoization mechanism should be implemented
  // for example, we could store top 100 flights
  // TODO: error handling middlware should be implemented: https://expressjs.com/en/guide/error-handling.html
  app.get('/routes/:source/:destination', async (req, res) => {
    const source = req.params['source'];
    const destination = req.params['destination'];
    if (source === undefined || destination === undefined) {
      return res.status(400).send('Must provide source and destination airports');
    }

    const sourceAirport = airportsByCode.get(source.toLowerCase());
    const destinationAirport = airportsByCode.get(destination.toLowerCase());

    if (sourceAirport === undefined || destinationAirport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO codes');
    }

    if (sourceAirport === destinationAirport) {
      return res.status(400).send('Destination airport must be different from source airport');
    }

    try {
      const shortestPath: PathResult = getShortestPath(
        graph,
        sourceAirport.id,
        destinationAirport.id,
        airports
      )

      if (isFoundPathResult(shortestPath)) {
        return res.status(200).send({
          source,
          destination,
          distance: shortestPath.distance,
          hops: shortestPath.path.map((airportId: string) => {
            const airport =  airports.find(({ id }: Airport): boolean => airportId === id);

            return airport.iata || airport.icao;
          })
        });
      }
      return res.status(404).send('Flight is not found. Increse layover count and try once more.');
    } catch (err) {
      return res.status(500).send('Internal Server Error');
    }


  });

  return app;
}
