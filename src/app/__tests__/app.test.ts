import * as request from 'supertest';

import { createApp } from '../index';

const TIMEOUT = 10_000;

let server: Express.Application;

/**
 * NB: haversine distance result differs from greatcirclemap.com
 */
describe('server', () => {
  // todo: corner cases are not present in test-cases
  // there should be more unit-test
  beforeAll(async () => {
    server = await createApp();
  }, 10_000_000);

  describe('shortest route', () => {
    it('correctly routes from TLL to SFO', async () => {
      // https://www.greatcirclemap.com/?routes=TLL-TRD-KEF-YEG-SFO%2C%20TLL-ARN-OAK-SFO
      const response = await request(server).get('/routes/TLL/SFO');
      const body = response.body;

      expect(body.distance).toBeWithin(8980, 9030);
      expect(body).toEqual(expect.objectContaining({
        source: 'TLL',
        destination: 'SFO',
      }));

      // There are multiple acceptable hop sequences, check for either
      expect([
        ['TLL', 'TRD', 'KEF', 'YEG', 'SFO'],
        ['TLL', 'ARN', 'OAK', 'SFO'],
      ]).toContainEqual(body.hops);
    }, TIMEOUT);


    it('correctly routes from HAV to TAY', async () => {
      // https://www.greatcirclemap.com/?routes=%20HAV-NAS-JFK-HEL-TAY
      const response = await request(server).get('/routes/HAV/TAY');
      const body = response.body;

      expect(body.distance).toBeWithin(9170, 9200);
      expect(body).toEqual(expect.objectContaining({
        source: 'HAV',
        destination: 'TAY',
        hops: ['HAV', 'NAS', 'JFK', 'HEL', 'TAY'],
      }));
    }, TIMEOUT);
  });

  describe('routes extended via ground', () => {
    it('correctly routes from TLL to LHR', async () => {
      // https://www.greatcirclemap.com/?routes=TLL-STN-LHR
      const response = await request(server).get('/routes/TLL/LHR');
      const body = response.body;

      expect(body.distance).toBeWithin(1800, 1820);
      expect(body).toEqual(expect.objectContaining({
        source: 'TLL',
        destination: 'LHR',
        hops: ['TLL', 'STN', 'LHR'],
      }));
    }, TIMEOUT);
  });
});
