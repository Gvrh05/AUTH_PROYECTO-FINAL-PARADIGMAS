import express from 'express';
import request from 'supertest';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { corsOrigins } from './cors';

@Module({})
class FixtureModule {}
describe('CORS exact origin allowlist', () => {
  it('allows localhost and Netlify and rejects malformed configuration', () => {
    expect(
      corsOrigins(
        'http://localhost:5173, https://project-deploy-985df3.netlify.app',
      ),
    ).toEqual([
      'http://localhost:5173',
      'https://project-deploy-985df3.netlify.app',
    ]);
    for (const origin of [
      '*',
      'https://example.com/',
      'https://user:pass@example.com',
      'https://example.com/path',
    ])
      expect(() => corsOrigins(origin)).toThrow();
  });
  it('responds to Netlify preflight without allowing unrelated origins', async () => {
    const app = await NestFactory.create(FixtureModule, { logger: false });
    app.enableCors({
      origin: corsOrigins(
        'http://localhost:5173,https://project-deploy-985df3.netlify.app',
      ),
    });
    await app.init();
    try {
      const server = app.getHttpServer() as ReturnType<typeof express>;
      await request(server)
        .options('/auth/login')
        .set('Origin', 'https://project-deploy-985df3.netlify.app')
        .set('Access-Control-Request-Method', 'POST')
        .expect(
          'Access-Control-Allow-Origin',
          'https://project-deploy-985df3.netlify.app',
        );
      const denied = await request(server)
        .options('/auth/login')
        .set('Origin', 'https://untrusted.example')
        .set('Access-Control-Request-Method', 'POST');
      expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
