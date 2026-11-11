import 'dotenv/config';
import { metrics } from '@opentelemetry/api';
import { startNodeSdk } from '@opentelemetry/sdk-node';
import type { Request, Response, NextFunction } from 'express';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';

process.env.OTEL_EXPORTER_OTLP_PROTOCOL ??= 'http/protobuf';
process.env.OTEL_METRICS_EXPORTER ??= 'otlp';
process.env.OTEL_TRACES_EXPORTER ??= 'none';
process.env.OTEL_LOGS_EXPORTER ??= 'none';

const sdk = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
  ? startNodeSdk({
      // Do not export process command arguments or arbitrary environment metadata.
      resourceDetectors: [],
      resourceAttributes: {
        'service.name': process.env.OTEL_SERVICE_NAME || 'profelink-auth',
        'deployment.environment.name':
          process.env.OTEL_DEPLOYMENT_ENVIRONMENT || 'local',
      },
    })
  : undefined;

export const shutdownTelemetry = () => sdk?.shutdown() ?? Promise.resolve();

@Injectable()
export class TelemetryLifecycle implements OnApplicationShutdown {
  onApplicationShutdown() {
    return shutdownTelemetry();
  }
}

export function authMetricsMiddleware() {
  const meter = metrics.getMeter('profelink-auth');
  const requests = meter.createCounter('auth_http_requests', {
    description: 'Completed Auth HTTP requests',
  });
  const duration = meter.createHistogram('auth_http_request_duration', {
    unit: 's',
  });
  const legacyDuration = meter.createHistogram('auth_http_duration_ms');
  return (request: Request, response: Response, next: NextFunction) => {
    const started = performance.now();
    response.once('finish', () => {
      // Use route templates, never usernames, UUIDs, query strings or tokens.
      const route = request.route as { path?: unknown } | undefined;
      const attributes = {
        route: typeof route?.path === 'string' ? route.path : 'unmatched',
        method: request.method,
        status: String(response.statusCode),
        'http.request.method': request.method,
        'http.route':
          typeof route?.path === 'string' ? route.path : 'unmatched',
        'http.response.status_code': response.statusCode,
      };
      requests.add(1, attributes);
      duration.record((performance.now() - started) / 1000, attributes);
      legacyDuration.record(performance.now() - started, attributes);
    });
    next();
  };
}
