import express from 'express';
import request from 'supertest';
import { observeHttp } from './telemetry';
import { metrics } from '@opentelemetry/api';

jest.mock('@opentelemetry/api', () => {
  const add = jest.fn();
  const record = jest.fn();
  return {
    metrics: {
      getMeter: () => ({
        createCounter: () => ({ add }),
        createHistogram: () => ({ record }),
      }),
    },
  };
});
// eslint-disable-next-line @typescript-eslint/unbound-method -- jest factory replaces this instrument with a standalone mock
const add = jest.mocked(metrics.getMeter('test').createCounter('test').add);
const record = jest.mocked(
  // eslint-disable-next-line @typescript-eslint/unbound-method -- jest factory replaces this instrument with a standalone mock
  metrics.getMeter('test').createHistogram('test').record,
);
jest.mock('@opentelemetry/sdk-node', () => ({
  startNodeSdk: () => ({ shutdown: () => Promise.resolve() }),
}));

describe('Auth HTTP telemetry', () => {
  beforeEach(() => jest.clearAllMocks());
  it('counts successful and failed login with bounded labels and no credentials', async () => {
    const app = express();
    app.use(observeHttp);
    app.post('/auth/login', (_req, res) => res.status(401).end());
    app.get('/auth/health', (_req, res) => res.status(200).end());
    await request(app)
      .post('/auth/login?username=private')
      .set('Authorization', 'Bearer private-token')
      .send({ password: 'private-password' })
      .expect(401);
    await request(app).get('/auth/health').expect(200);
    expect(add).toHaveBeenCalledWith(1, {
      method: 'POST',
      route: '/auth/login',
      status: '401',
    });
    expect(add).toHaveBeenCalledWith(1, {
      method: 'GET',
      route: '/auth/health',
      status: '200',
    });
    expect(JSON.stringify(add.mock.calls)).not.toContain('private');
    expect(record).toHaveBeenCalledTimes(2);
  });
  it('does not create a label for each unknown path', async () => {
    const app = express();
    app.use(observeHttp);
    await request(app).get('/unknown/private-id').expect(404);
    expect(add).toHaveBeenCalledWith(1, {
      method: 'GET',
      route: 'unmatched',
      status: '404',
    });
  });
});
