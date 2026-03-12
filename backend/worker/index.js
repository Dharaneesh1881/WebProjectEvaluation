import 'dotenv/config';
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { redisConnection } from '../queue/index.js';
import { runEvaluation } from './evaluator.js';
import Submission from '../models/Submission.js';

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/web_eval');
mongoose.connection.on('connected', () => console.log('Worker: MongoDB connected'));

const worker = new Worker('evaluation', async (job) => {
  const { submissionId, assignmentId } = job.data;
  console.log(`Worker: picked up job for submissionId ${submissionId}`);

  await Submission.updateOne({ submissionId }, { status: 'processing' });

  try {
    await runEvaluation(submissionId, assignmentId);
    await Submission.updateOne({ submissionId }, { status: 'done' });
    console.log(`Worker: completed ${submissionId}`);
  } catch (err) {
    console.error(`Worker: error for ${submissionId}:`, err.message);
    await Submission.updateOne({ submissionId }, { status: 'error' });
    throw err;   // re-throw so BullMQ retries
  }
}, {
  connection: redisConnection,
  concurrency: 1   // process one evaluation at a time (Puppeteer is heavy)
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('Evaluation worker started');
