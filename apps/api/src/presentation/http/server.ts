import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import EnvironmentConfig from '../../infrastructure/config/Environment';
import { errorHandler } from './plugins/errorHandler';
import { registerRoutes } from './routes';

export async function createServer(): Promise<FastifyInstance> {
  const env = EnvironmentConfig.get();

  const server = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      // biome-ignore lint/suspicious/noExplicitAny: Fastify logger options type is complex
    } as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register security plugins
  await server.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await server.register(cors, {
    origin:
      env.NODE_ENV === 'production'
        ? ['https://pointly.sa', 'https://merchant.pointly.sa', 'https://app.pointly.sa']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  // Register error handler
  server.setErrorHandler(errorHandler);

  // Register routes
  // biome-ignore lint/suspicious/noExplicitAny: FastifyInstance type variance issue
  await registerRoutes(server as any);

  return server;
}

export async function startServer(): Promise<void> {
  const env = EnvironmentConfig.get();

  try {
    const server = await createServer();

    await server.listen({
      port: env.API_PORT,
      host: env.API_HOST,
    });

    server.log.info(`Server listening on ${env.API_HOST}:${env.API_PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
