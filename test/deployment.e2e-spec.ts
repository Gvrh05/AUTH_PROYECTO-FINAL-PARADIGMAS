import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/app.setup';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('Deployment: CORS and Scalar (without database)', () => {
  it('allows configured origins on docs, JSON and preflight, but not other origins', async () => {
    const previous = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN =
      'https://classroom.netlify.app, http://localhost:5173';
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    const app: INestApplication<App> = module.createNestApplication();
    try {
      configureApp(app);
      await app.init();
      const http = request(app.getHttpServer());
      for (const path of ['/auth/docs', '/auth/docs/openapi.json']) {
        await http
          .get(path)
          .set('Origin', 'https://classroom.netlify.app')
          .expect(200)
          .expect(
            'Access-Control-Allow-Origin',
            'https://classroom.netlify.app',
          );
      }
      await http.get('/auth/docs/openapi.json').expect('Content-Type', /json/);
      await http
        .options('/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204)
        .expect('Access-Control-Allow-Origin', 'http://localhost:5173');
      const blocked = await http
        .get('/auth/docs')
        .set('Origin', 'https://untrusted.example');
      expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await app.close();
      if (previous === undefined) delete process.env.CORS_ORIGIN;
      else process.env.CORS_ORIGIN = previous;
    }
  });
});
