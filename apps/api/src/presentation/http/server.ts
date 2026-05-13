import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import EnvironmentConfig from '../../infrastructure/config/Environment';
import { cognitoAuthPlugin } from './plugins/cognitoAuth';
import { cognitoCustomerAuthPlugin } from './plugins/cognitoCustomerAuth';
import { errorHandler } from './plugins/errorHandler';
import { registerRoutes } from './routes';

export async function createServer(): Promise<FastifyInstance> {
  const env = EnvironmentConfig.get();

  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature requires bracket notation for process.env
  const isLocal = env.NODE_ENV !== 'production' && !process.env['AWS_LAMBDA_FUNCTION_NAME'];

  const loggerOptions = isLocal
    ? {
        level: env.NODE_ENV === 'production' ? 'info' : ('debug' as const),
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        level: env.NODE_ENV === 'production' ? 'info' : ('debug' as const),
      };

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const server = Fastify({
    logger: loggerOptions,
    requestIdLogLabel: 'requestId',
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      if (typeof incoming === 'string' && UUID_RE.test(incoming)) {
        return incoming;
      }
      return crypto.randomUUID();
    },
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

  // Register Cognito JWT authentication (merchant + customer)
  await server.register(cognitoAuthPlugin);
  await server.register(cognitoCustomerAuthPlugin);

  // Register error handler
  server.setErrorHandler(errorHandler);

  // Structured audit log for every completed request — critical for a financial system.
  // Registered before routes so all handlers are covered.
  server.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        merchantId: request.merchantId || undefined,
        customerId: request.customerId || undefined,
        userAgent: request.headers['user-agent'],
      },
      'request completed',
    );
    done();
  });

  // Register routes
  await registerRoutes(server);

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
