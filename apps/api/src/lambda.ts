import type { PromiseHandler } from '@fastify/aws-lambda';
import awsLambdaFastify from '@fastify/aws-lambda';
import * as Sentry from '@sentry/aws-serverless';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { createServer } from './presentation/http/server';

Sentry.init({
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature
  dsn: process.env['SENTRY_DSN'],
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature
  environment: process.env['ENVIRONMENT'] ?? 'dev',
  tracesSampleRate: 0.05,
});

let proxy: PromiseHandler<APIGatewayProxyEvent> | null = null;

async function getProxy() {
  if (!proxy) {
    const server = await createServer();
    proxy = awsLambdaFastify(server, {
      decorateRequest: true,
      serializeLambdaArguments: false,
    });
  }
  return proxy;
}

export const handler = Sentry.wrapHandler(async (event: APIGatewayProxyEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const proxyHandler = await getProxy();
  return proxyHandler(event, context);
});
