import express from 'express';
import request from 'supertest';
import { authMetricsMiddleware } from './telemetry';

const add = jest.fn();
const record = jest.fn();
jest.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: () => ({
      createCounter: () => ({ add }),
      createHistogram: () => ({ record }),
    }),
  },
}));
jest.mock('@opentelemetry/sdk-node', () => ({
  startNodeSdk: () => ({ shutdown: () => Promise.resolve() }),
}));

describe('Auth HTTP telemetry', () => {
  beforeEach(() => jest.clearAllMocks());
  it('counts successful and failed login with bounded labels and no credentials', async () => {
    const app = express();
    app.use(authMetricsMiddleware());
    app.post('/auth/login', (_req, res) => res.status(401).end());
    app.get('/auth/health', (_req, res) => res.status(200).end());
    await request(app)
      .post('/auth/login?username=private')
      .set('Authorization', 'Bearer private-token')
      .send({ password: 'private-password' })
      .expect(401);
    await request(app).get('/auth/health').expect(200);
    expect(add).toHaveBeenCalledWith(1, {
      'http.request.method': 'POST',
      'http.route': '/auth/login',
      'http.response.status_code': 401,
    });
    expect(add).toHaveBeenCalledWith(1, {
      'http.request.method': 'GET',
      'http.route': '/auth/health',
      'http.response.status_code': 200,
    });
    expect(JSON.stringify(add.mock.calls)).not.toContain('private');
    expect(record).toHaveBeenCalledTimes(2);
  });
  it('does not create a label for each unknown path', async () => {
    const app = express();
    app.use(authMetricsMiddleware());
    await request(app).get('/unknown/private-id').expect(404);
    expect(add).toHaveBeenCalledWith(1, {
      'http.request.method': 'GET',
      'http.route': 'unmatched',
      'http.response.status_code': 404,
    });
  });
});
