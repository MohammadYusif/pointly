import type { PromiseHandler } from '@fastify/aws-lambda';
import awsLambdaFastify from '@fastify/aws-lambda';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { createServer } from './presentation/http/server';

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

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const proxyHandler = await getProxy();
  return proxyHandler(event, context);
};
