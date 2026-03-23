export const logger = {
  info: (msg: string, meta?: Record<string, unknown>): void => {
    console.log(
      JSON.stringify({
        level: 'info',
        msg,
        ...meta,
        timestamp: new Date().toISOString(),
      }),
    );
  },
  warn: (msg: string, meta?: Record<string, unknown>): void => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg,
        ...meta,
        timestamp: new Date().toISOString(),
      }),
    );
  },
  error: (msg: string, meta?: Record<string, unknown>): void => {
    console.error(
      JSON.stringify({
        level: 'error',
        msg,
        ...meta,
        timestamp: new Date().toISOString(),
      }),
    );
  },
};
