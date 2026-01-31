import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
}

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      // biome-ignore lint/complexity/useLiteralKeys: Index signature requires bracket notation
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
    };

    return response;
  });

  server.get('/v1/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      // biome-ignore lint/complexity/useLiteralKeys: Index signature requires bracket notation
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
    };

    return response;
  });
}
