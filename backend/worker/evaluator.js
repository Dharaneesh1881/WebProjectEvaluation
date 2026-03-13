/**
 * evaluator.js — Main orchestrator
 *
 * Pipeline (in order):
 *  1. buildPage          — assemble student code into temp HTML file
 *  2. runLinters         — HTMLHint + Stylelint + ESLint          (10 marks)
 *  3. runLighthouse      — Lighthouse performance                  (15 marks)
 *  4. Puppeteer launches (ONE browser, multiple isolated contexts)
 *  5. runFunctionalityTests — behavior contract engine            (40 marks)
 *  6. runInteractionTests   — click/type simulations              (15 marks)
 *  7. runVisualTest         — grayscale pixelmatch                 (20 marks)
 *  8. calculateScore     — aggregate all 5 buckets               (100 marks)
 *  9. Save EvaluationRun to MongoDB
 * 10. Publish Redis event → Socket.IO → student sees results
 */

import puppeteer from 'puppeteer';
import IORedis from 'ioredis';
import Submission from '../models/Submission.js';
import EvaluationRun from '../models/EvaluationRun.js';
import Assignment from '../models/Assignment.js';
import StudentProgress from '../models/StudentProgress.js';
import { buildPage, cleanupPage } from './pageBuilder.js';
import { runLinters } from './linterRunner.js';
import { runFunctionalityTests } from './functionalityTests.js';
import { runInteractionTests } from './tests/interactionTests.js';
import { runVisualTest } from './visualTest.js';
import { runLighthouse } from './lighthouseRunner.js';
import { calculateScore } from './scoreCalculator.js';
import { getMainFile, mergeFilesByType, normalizeStoredFiles } from '../utils/projectFiles.js';

const redisPub = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null
});

function resolveReferencePages(assignment) {
  const pageScreenshots = Array.isArray(assignment.referencePageScreenshots)
    ? assignment.referencePageScreenshots.filter((page) => page?.pageName && page?.url)
    : [];

  if (pageScreenshots.length > 0) {
    return pageScreenshots;
  }

  if (assignment.referenceScreenshotUrl) {
    return [{
      pageName: getMainFile(assignment.files, 'html')?.name || 'index.html',
      url: assignment.referenceScreenshotUrl,
      isMain: true
    }];
  }

  return [];
}

export async function runEvaluation(submissionId, assignmentId) {
  const [submission, assignment] = await Promise.all([
    Submission.findOne({ submissionId }),
    Assignment.findById(assignmentId)
  ]);

  if (!submission) throw new Error(`Submission ${submissionId} not found`);
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  const files = normalizeStoredFiles(submission.files);
  const mainHtml = getMainFile(files, 'html');
  const mergedCss = mergeFilesByType(files, 'css');
  const mergedJs = mergeFilesByType(files, 'js');
  const spec = assignment.evalSpec;

  // ── 1. Build temp file ─────────────────────────────────────────────────
  const { filePath, dir, pageFilePaths } = await buildPage(submissionId, files);
  const fileUrl = `file://${filePath}`;

  let linterResult = null;
  let functionalityResult = null;
  let interactionResults = [];
  let visualResult = null;
  let performanceResult = null;

  try {
    // ── 2. Linters (no browser needed) ──────────────────────────────────
    console.log(`[${submissionId}] Running linters...`);
    linterResult = await runLinters(mainHtml?.content || '', mergedCss, mergedJs);
    console.log(`[${submissionId}] Linter score: ${linterResult.score}/10`);

    // ── 3. Lighthouse (needs its own browser) ────────────────────────────
    console.log(`[${submissionId}] Running Lighthouse...`);
    performanceResult = await runLighthouse(filePath);
    console.log(`[${submissionId}] Performance score: ${performanceResult.score}/15`);

    // ── 4. Launch main Puppeteer browser ─────────────────────────────────
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      // ── 5. Functionality tests (40 marks) ──────────────────────────────
      const fnTests = spec.functionalityTests ?? [];
      console.log(`[${submissionId}] Functionality tests (${fnTests.length} cases)...`);
      functionalityResult = await runFunctionalityTests(browser, fileUrl, fnTests);
      console.log(`[${submissionId}] Functionality score: ${functionalityResult.score}/40`);

      // ── 6. Interaction tests (15 marks) ────────────────────────────────
      const intTests = spec.interactionTests ?? [];
      if (intTests.length > 0) {
        console.log(`[${submissionId}] Interaction tests (${intTests.length} tests)...`);
        interactionResults = await runInteractionTests(browser, fileUrl, intTests);
      }

      // ── 7. Visual test (20 marks — grayscale pixelmatch) ────────────────
      console.log(`[${submissionId}] Visual test...`);
      visualResult = await runVisualTest(
        browser,
        {
          pageFilePaths,
          submissionId,
          assignmentId,
          referencePages: resolveReferencePages(assignment)
        }
      );
    } finally {
      await browser.close();
    }

  } finally {
    await cleanupPage(dir);
  }

  // ── 8. Calculate final score ───────────────────────────────────────────
  const breakdown = calculateScore({
    linterResult,
    functionalityResult,
    interactionResults,
    visualResult,
    performanceResult
  });

  console.log(`[${submissionId}] Final score: ${breakdown.totalScore}/100`);

  // ── 9. Look up existing best score for this student+assignment ────────────
  const studentId = submission.studentId;
  const existing = await StudentProgress.findOne({ studentId, assignmentId });
  const prevBest = existing?.bestScore ?? -1;
  const newScore = breakdown.totalScore;
  const isBetter = newScore > prevBest;

  console.log(`[${submissionId}] Score: ${newScore} | Prev best: ${prevBest === -1 ? 'none' : prevBest} | Better: ${isBetter}`);

  // Always create the EvaluationRun so the student can fetch their result right now
  await EvaluationRun.create({
    submissionId,
    completedAt: new Date(),
    totalScore: newScore,
    breakdown: {
      linter: breakdown.linter,
      functionality: breakdown.functionality,
      interaction: breakdown.interaction,
      visual: breakdown.visual,
      performance: breakdown.performance
    }
  });

  // ── 10. Upsert StudentProgress ──────────────────────────────────
  const now = new Date();
  const progressUpdate = {
    $inc: { attempts: 1 },
    $set: { updatedAt: now }
  };

  if (isBetter) {
    progressUpdate.$set.bestScore = newScore;
    progressUpdate.$set.bestSubmissionId = submissionId;
    if (newScore >= 50 && !existing?.completed) {
      progressUpdate.$set.completed = true;
      progressUpdate.$set.completedAt = now;
      console.log(`[${submissionId}] Student ${studentId} COMPLETED assignment ${assignmentId} with score ${newScore}`);
    }
  }

  await StudentProgress.findOneAndUpdate(
    { studentId, assignmentId },
    progressUpdate,
    { upsert: true, new: true }
  );

  // ── 11. Notify via Redis → Socket.IO ──────────────────────────────
  await redisPub.publish('eval:done', JSON.stringify({ submissionId }));

  // ── 12. Cleanup — keep only ONE submission record per student per assignment ──
  // We wait 30 s so the student has time to fetch their result before we delete.
  setTimeout(async () => {
    try {
      if (isBetter) {
        // New submission is the new best — delete the OLD best's documents
        if (existing?.bestSubmissionId && existing.bestSubmissionId !== submissionId) {
          await Promise.all([
            EvaluationRun.deleteOne({ submissionId: existing.bestSubmissionId }),
            Submission.deleteOne({ submissionId: existing.bestSubmissionId })
          ]);
          console.log(`[cleanup] Deleted old best submission ${existing.bestSubmissionId} (superseded by ${submissionId})`);
        }
      } else {
        // New submission is NOT better — delete THIS submission's documents, old best stays
        await Promise.all([
          EvaluationRun.deleteOne({ submissionId }),
          Submission.deleteOne({ submissionId })
        ]);
        console.log(`[cleanup] Deleted non-best submission ${submissionId} (best remains ${existing?.bestSubmissionId})`);
      }
    } catch (err) {
      console.error('[cleanup] Error during submission cleanup:', err.message);
    }
  }, 30_000); // 30-second grace period for the student to fetch results
}
