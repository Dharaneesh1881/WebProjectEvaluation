/**
 * lighthouseRunner.js — Performance scoring (15 marks)
 *
 * Runs Lighthouse on the student's built HTML file.
 * Uses a dedicated browser instance so it doesn't interfere with evaluation.
 *
 * Scoring:
 *   Lighthouse performance score (0–100) → scaled to 0–15 marks
 *
 * If Lighthouse fails completely (system fault, not student fault):
 *   → fall back to code-size-based heuristic scoring
 */

import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';

// ── Lighthouse runner ──────────────────────────────────────────────────────
async function tryLighthouse(filePath) {
  // Dynamic import because lighthouse is ESM
  const { default: lighthouse } = await import('lighthouse');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0'   // OS picks a free port
    ]
  });

  try {
    const wsEndpoint = browser.wsEndpoint();
    const port       = parseInt(new URL(wsEndpoint).port, 10);

    const runResult = await lighthouse(`file://${filePath}`, {
      logLevel: 'error',
      output:   'json',
      onlyCategories: ['performance'],
      port,
      settings: {
        formFactor:        'desktop',
        throttlingMethod:  'provided',
        throttling: {
          rttMs:                  0,
          throughputKbps:         0,
          cpuSlowdownMultiplier:  1,
          requestLatencyMs:       0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps:   0
        },
        screenEmulation: {
          mobile:     false,
          width:      1280,
          height:     720,
          deviceScaleFactor: 1,
          disabled:   false
        }
      }
    });

    const lhr  = runResult.lhr;
    const perf = Math.round((lhr.categories.performance.score ?? 0) * 100);

    return {
      performanceScore: perf,
      metrics: {
        fcp:       lhr.audits['first-contentful-paint']?.displayValue   ?? null,
        tbt:       lhr.audits['total-blocking-time']?.displayValue       ?? null,
        si:        lhr.audits['speed-index']?.displayValue               ?? null,
        unusedCss: lhr.audits['unused-css-rules']?.details?.overallSavingsBytes ?? 0,
        unusedJs:  lhr.audits['unused-javascript']?.details?.overallSavingsBytes ?? 0
      }
    };
  } finally {
    await browser.close();
  }
}

// ── Fallback: code-size heuristic ──────────────────────────────────────────
// If Lighthouse fails we estimate performance from file sizes and DOM complexity.
// Score 0–100, then scale to 15.
async function codeSizeHeuristic(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const sizeKb  = Buffer.byteLength(content, 'utf-8') / 1024;

    // Quick DOM count estimation (no browser needed)
    const tagMatches = content.match(/<[a-zA-Z]/g) ?? [];
    const domCount   = tagMatches.length;

    // Rough scoring:
    //   < 50 KB and < 200 DOM nodes → ~90
    //   < 100 KB and < 500 DOM nodes → ~70
    //   else → ~50
    let score = 90;
    if (sizeKb > 100 || domCount > 500) score = 50;
    else if (sizeKb > 50 || domCount > 200)  score = 70;

    return { performanceScore: score, metrics: { sizeKb: parseFloat(sizeKb.toFixed(1)), domCount } };
  } catch {
    return { performanceScore: 60, metrics: {} };
  }
}

// ── Main export ────────────────────────────────────────────────────────────
export async function runLighthouse(filePath) {
  const result = {
    score:            0,
    maxScore:         15,
    performanceScore: null,
    metrics:          {},
    source:           'lighthouse',
    error:            null
  };

  let data;
  try {
    data          = await tryLighthouse(filePath);
    result.source = 'lighthouse';
  } catch (err) {
    console.warn('[lighthouseRunner] Lighthouse failed, using fallback:', err.message);
    result.error  = err.message;
    data          = await codeSizeHeuristic(filePath);
    result.source = 'heuristic';
  }

  result.performanceScore = data.performanceScore;
  result.metrics          = data.metrics;

  // Scale 0–100 → 0–15
  result.score = parseFloat(((data.performanceScore / 100) * 15).toFixed(2));

  return result;
}
