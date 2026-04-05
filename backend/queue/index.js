import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Support both REDIS_URL (Upstash / production) and host+port (local dev)
export const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null
    });

export const evaluationQueue = new Queue('evaluation', {
  connection: redisConnection
});
