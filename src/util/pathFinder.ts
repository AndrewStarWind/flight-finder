import PriorityQueue from 'ts-priority-queue';
import { Graph } from 'graphlib';

import { haversine } from '.';
import { MAX_LAYOVERS, MAX_GROUND_HOP_DISTANCE } from './const';

import type { Airport, Route } from '../data';

interface QueueItem {
  current: string;
  legCount: number;
  isGroundHop: boolean;
  distance: number;
}

type NotFoundPathResult = {
  isFound: boolean
}

type FoundPathResult = NotFoundPathResult & {
  path: string[],
  distance: number
}

export type PathResult = NotFoundPathResult | FoundPathResult;

export function isFoundPathResult(pathResult: PathResult): pathResult is FoundPathResult {
  return pathResult.isFound;
}

const constructGraph = (airports: Airport[], flights: Route[]): Graph => {
  const graph = new Graph({ directed: true });

  airports.forEach(({ id }: Airport) => {
    graph.setNode(id);
  });

  flights.forEach((flight: Route) => {
    graph.setEdge(
      flight.source.id,
      flight.destination.id,
      {
        weight: flight.distance,
        isFlight: true
      }
    );
  });

  airports.forEach((airport) => {
    airports.forEach(({ id, location }) => {
      if (id !== airport.id) {
        const distance = haversine(
          airport.location.latitude,
          airport.location.longitude,
          location.latitude,
          location.longitude
        );

        if (distance < MAX_GROUND_HOP_DISTANCE) {
          graph.setEdge(
            airport.id,
            id,
            {
              weight: distance,
              isFlight: false
            }
          );
        }
      }
    })
  });

  return graph;
}

const aStar = (graph: Graph, heuristic: Function, start: string, goal: string, airports: Airport[]): PathResult => {
  const queue = new PriorityQueue<QueueItem>({
    comparator: (a: QueueItem, b: QueueItem): number => {
      return fScoreMap.get(a.current) - fScoreMap.get(b.current);
    }
  });
  const visited = new Set<string>();
  const cameFrom = new Map<string, string>();
  const gScoreMap = new Map<string, number>();
  const fScoreMap = new Map<string, number>();

  airports.forEach(({ id }: Airport) => {
    fScoreMap.set(id, Infinity);
    gScoreMap.set(id, Infinity);
  });

  fScoreMap.set(start, 0);
  gScoreMap.set(start, heuristic(start, goal));

  queue.queue({
    current: start,
    legCount: 0,

    // dunno if it's ground hop is possible from the source airport,
    // but it does sounds reasonable
    // if not just change it to true
    isGroundHop: false,
    distance: 0
  });

  while (queue.length !== 0) {
    const {
      current,
      legCount,
      isGroundHop,
      distance
    } = queue.dequeue();

    if (current === goal) {
      return reconstructPath(cameFrom, current, distance);
    }

    if (legCount >= MAX_LAYOVERS) {
      continue;
    }

    const neighbors: string[] = graph.neighbors(current) || [];

    visited.add(current);

    for (const neighbor of neighbors) {
      if (!graph.hasEdge(current, neighbor)) {
        continue;
      }

      const { weight: currentDistance, isFlight } = graph.edge(current, neighbor);

      // we don't need to go deeper if the solution is not found yet and it's not ground hop
      if (legCount > MAX_LAYOVERS - 2 && neighbor !== goal && isFlight) {
        continue;
      }

      if (isGroundHop && !isFlight) {
        continue;
      }

      const currentGScore: number = gScoreMap.get(current) + currentDistance;

      if (currentGScore < gScoreMap.get(neighbor)) {
        if (!visited.has(neighbor)) {
          cameFrom.set(neighbor, current);
          gScoreMap.set(neighbor, currentGScore);
          fScoreMap.set(neighbor, currentGScore + heuristic(neighbor, goal));
          queue.queue({
            current: neighbor,
            distance: distance + currentDistance,
            legCount: isFlight ? legCount + 1 : legCount,
            isGroundHop: !isFlight
          });
        }
      }
    }
  }
  return {
    isFound: false
  }
}

const reconstructPath = (cameFrom: Map<string, string>, current: string, distance: number): PathResult => {
  const totalPath: string[] = [current];

  while (cameFrom.has(current)) {
    const newCurrent = cameFrom.get(current);

    cameFrom.delete(current);
    totalPath.push(newCurrent);
    current = newCurrent;
  }

  return {
    path: totalPath.reverse(),
    distance: Math.round(distance),
    isFound: true
  }
}

const getShortestPath = (graph: Graph, startAirportId: string, endAirportId: string, airports: Airport[]): PathResult => {
  const path = aStar(
    graph,
    (airportA: string, airportB: string) => {
      const locationA = airports.find(({ id }: Airport) => airportA === id).location;
      const locationB = airports.find(({ id }: Airport) => airportB === id).location;

      return haversine(
        locationA.latitude,
        locationA.longitude,
        locationB.latitude,
        locationB.longitude
      );
    },
    startAirportId,
    endAirportId,
    airports
  )

  return {
    ...path
  };
};

export {
  getShortestPath,
  constructGraph
}