import puppeteer from 'puppeteer';
import IORedis from 'ioredis';
import Submission from '../models/Submission.js';
import EvaluationRun from '../models/EvaluationRun.js';
import { buildPage, cleanupPage } from './pageBuilder.js';
import { runDomTests } from './tests/domTests.js';
import { runStyleTests } from './tests/styleTests.js';
import { runInteractionTests } from './tests/interactionTests.js';
import { runVisualTest } from './visualTest.js';
import { calculateScore } from './scoreCalculator.js';
import { quizSpec } from '../evalSpec/quiz.js';

const redisPub = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null
});

export async function runEvaluation(submissionId) {
  const submission = await Submission.findOne({ submissionId });
  if (!submission) throw new Error(`Submission ${submissionId} not found`);

  const { html, css, js } = submission.files;
  const { filePath, dir } = await buildPage(submissionId, { html, css, js });
  const fileUrl = `file://${filePath}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let domResults, styleResults, interactionResults, visualResult;

  try {
    console.log(`[${submissionId}] Running DOM tests...`);
    domResults = await runDomTests(browser, fileUrl, quizSpec.domTests);

    console.log(`[${submissionId}] Running style tests...`);
    styleResults = await runStyleTests(browser, fileUrl, quizSpec.styleTests);

    console.log(`[${submissionId}] Running interaction tests...`);
    interactionResults = await runInteractionTests(browser, fileUrl, quizSpec.interactionTests);

    console.log(`[${submissionId}] Running visual test...`);
    visualResult = await runVisualTest(browser, fileUrl, quizSpec.baselineScreenshotPath);
  } finally {
    await browser.close();
    await cleanupPage(dir);
  }

  const breakdown = calculateScore({
    domResults,
    styleResults,
    interactionResults,
    visualResult,
    rubric: quizSpec.rubric
  });

  console.log(`[${submissionId}] Total score: ${breakdown.totalScore}`);

  await EvaluationRun.create({
    submissionId,
    completedAt: new Date(),
    totalScore: breakdown.totalScore,
    breakdown: {
      html:   breakdown.html,
      css:    breakdown.css,
      js:     breakdown.js,
      visual: breakdown.visual
    }
  });

  // Notify API server via Redis pub/sub
  await redisPub.publish('eval:done', JSON.stringify({ submissionId }));
}
