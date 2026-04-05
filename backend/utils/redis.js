import IORedis from 'ioredis';

/**
 * Creates an IORedis client.
 * Supports REDIS_URL (Upstash / production) and REDIS_HOST+PORT (local dev).
 * Parses the URL manually to avoid ioredis URL-parsing quirks when options
 * are passed as a second argument.
 */
export function createRedisClient(extraOptions = {}) {
  const url = process.env.REDIS_URL;

  if (url) {
    const parsed = new URL(url);
    return new IORedis({
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
      ...extraOptions
    });
  }

  return new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    ...extraOptions
  });
}
