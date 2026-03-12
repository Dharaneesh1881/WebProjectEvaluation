import puppeteer from 'puppeteer';
import IORedis from 'ioredis';
import Submission from '../models/Submission.js';
import EvaluationRun from '../models/EvaluationRun.js';
import Assignment from '../models/Assignment.js';
import { buildPage, cleanupPage } from './pageBuilder.js';
import { runDomTests } from './tests/domTests.js';
import { runStyleTests } from './tests/styleTests.js';
import { runInteractionTests } from './tests/interactionTests.js';
import { runVisualTest } from './visualTest.js';
import { calculateScore } from './scoreCalculator.js';

const redisPub = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null
});

export async function runEvaluation(submissionId, assignmentId) {
  const [submission, assignment] = await Promise.all([
    Submission.findOne({ submissionId }),
    Assignment.findById(assignmentId)
  ]);

  if (!submission) throw new Error(`Submission ${submissionId} not found`);
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  const { html, css, js } = submission.files;
  const { filePath, dir } = await buildPage(submissionId, { html, css, js });
  const fileUrl = `file://${filePath}`;

  const spec = assignment.evalSpec;
  const rubric = spec.rubric || { html: 30, css: 25, js: 30, visual: 15 };

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let domResults = [], styleResults = [], interactionResults = [], visualResult;

  try {
    console.log(`[${submissionId}] DOM tests (${spec.domTests.length} tests)...`);
    domResults = await runDomTests(browser, fileUrl, spec.domTests);

    console.log(`[${submissionId}] Style tests (${spec.styleTests.length} tests)...`);
    styleResults = await runStyleTests(browser, fileUrl, spec.styleTests);

    if (spec.interactionTests && spec.interactionTests.length > 0) {
      console.log(`[${submissionId}] Interaction tests (${spec.interactionTests.length} tests)...`);
      interactionResults = await runInteractionTests(browser, fileUrl, spec.interactionTests);
    }

    console.log(`[${submissionId}] Visual test...`);
    visualResult = await runVisualTest(
      browser, fileUrl,
      submissionId, assignmentId,
      assignment.referenceScreenshotUrl
    );
  } finally {
    await browser.close();
    await cleanupPage(dir);
  }

  const breakdown = calculateScore({
    domResults,
    styleResults,
    interactionResults,
    visualResult,
    rubric
  });

  console.log(`[${submissionId}] Score: ${breakdown.totalScore}/100`);

  await EvaluationRun.create({
    submissionId,
    completedAt: new Date(),
    totalScore: breakdown.totalScore,
    breakdown: {
      html:   breakdown.html,
      css:    breakdown.css,
      js:     breakdown.js,
      visual: {
        ...breakdown.visual,
        studentScreenshotUrl:   visualResult.studentScreenshotUrl,
        referenceScreenshotUrl: visualResult.referenceScreenshotUrl,
        diffImageUrl:           visualResult.diffImageUrl
      }
    }
  });

  await redisPub.publish('eval:done', JSON.stringify({ submissionId }));
}
