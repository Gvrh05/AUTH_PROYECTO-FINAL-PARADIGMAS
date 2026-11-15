import 'dotenv/config';
import { metrics } from '@opentelemetry/api';
import { startNodeSdk } from '@opentelemetry/sdk-node';
import type { NextFunction, Request, Response } from 'express';

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()) {
  process.env.OTEL_EXPORTER_OTLP_PROTOCOL ??= 'http/protobuf';
  process.env.OTEL_LOGS_EXPORTER ??= 'none';
  startNodeSdk({
    resourceAttributes: {
      'service.name': process.env.OTEL_SERVICE_NAME || 'profelink-auth',
      'deployment.environment.name':
        process.env.OTEL_DEPLOYMENT_ENVIRONMENT || 'local',
    },
  });
}

const meter = metrics.getMeter('profelink-auth');
const requests = meter.createCounter('auth_http_requests');
const duration = meter.createHistogram('auth_http_duration_ms');

export function observeHttp(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const start = performance.now();
  response.once('finish', () => {
    const route = (request.route as { path?: unknown } | undefined)?.path;
    const attributes = {
      route: typeof route === 'string' ? route : 'unmatched',
      method: request.method,
      status: String(response.statusCode),
    };
    requests.add(1, attributes);
    duration.record(performance.now() - start, attributes);
  });
  next();
}
