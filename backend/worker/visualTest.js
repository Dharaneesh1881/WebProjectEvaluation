import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { uploadScreenshot, downloadImageAsBuffer } from '../utils/cloudinary.js';
import { enableRequestWhitelist } from './networkPolicy.js';

// ── Convert PNG to grayscale in-place ──────────────────────────────────────
// Removes color differences so layout/structure dominates the comparison.
function toGrayscale(png) {
  for (let i = 0; i < png.data.length; i += 4) {
    const r    = png.data[i];
    const g    = png.data[i + 1];
    const b    = png.data[i + 2];
    // Human-eye weighted formula (ITU-R BT.601)
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    png.data[i]     = gray;
    png.data[i + 1] = gray;
    png.data[i + 2] = gray;
    // alpha channel (i+3) left unchanged
  }
}

async function setupPage(browser, allowedDomains = []) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await enableRequestWhitelist(page, allowedDomains);

  await page.setViewport({ width: 1280, height: 720 });
  return { context, page };
}

async function capturePageScreenshot(page, url) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'
  });
  await new Promise(r => setTimeout(r, 300));
  return page.screenshot({ fullPage: false });
}

export async function runVisualTest(browser, {
  pageFilePaths,
  submissionId,
  assignmentId,
  referencePages = [],
  allowedDomains = []
}) {
  const noBaseline = {
    diffPercent: 100,
    diffScore: 0,
    studentScreenshotUrl: null,
    referenceScreenshotUrl: null,
    diffImageUrl: null,
    tests: []
  };

  if (!referencePages.length) {
    console.warn('No reference page screenshots — skipping visual test');
    return noBaseline;
  }

  const { context, page } = await setupPage(browser, allowedDomains);
  const results = [];
  const referenceByPage = new Map(referencePages.map((pageRef) => [pageRef.pageName, pageRef]));
  const studentPageNames = Object.keys(pageFilePaths || {});
  const allPageNames = Array.from(new Set([
    ...referencePages.map((pageRef) => pageRef.pageName),
    ...studentPageNames
  ]));

  try {
    for (const pageName of allPageNames) {
      const referencePage = referenceByPage.get(pageName) || null;
      const localPagePath = pageFilePaths?.[pageName];
      let screenshotBuffer = null;
      let studentScreenshotUrl = null;

      if (localPagePath) {
        screenshotBuffer = await capturePageScreenshot(page, `file://${localPagePath}`);

        try {
          studentScreenshotUrl = await uploadScreenshot(
            Buffer.from(screenshotBuffer),
            `submissions/${assignmentId}`,
            `student_${submissionId}_${pageName.replace(/[^\w.-]+/g, '_')}`
          );
        } catch (err) {
          console.error('Failed to upload student screenshot:', err.message);
        }
      }

      if (!referencePage) {
        results.push({
          pageName,
          diffPercent: 100,
          diffScore: 0,
          studentScreenshotUrl,
          referenceScreenshotUrl: null,
          diffImageUrl: null,
          error: 'Unexpected extra student page'
        });
        continue;
      }

      if (!localPagePath) {
        results.push({
          pageName,
          diffPercent: 100,
          diffScore: 0,
          studentScreenshotUrl: null,
          referenceScreenshotUrl: referencePage.url,
          diffImageUrl: null,
          error: 'Student page not found'
        });
        continue;
      }

      let referenceBuffer;
      try {
        referenceBuffer = await downloadImageAsBuffer(referencePage.url);
      } catch (err) {
        console.error('Failed to download reference screenshot:', err.message);
        results.push({
          pageName,
          diffPercent: 100,
          diffScore: 0,
          studentScreenshotUrl,
          referenceScreenshotUrl: referencePage.url,
          diffImageUrl: null,
          error: 'Reference screenshot download failed'
        });
        continue;
      }

      const img1 = PNG.sync.read(referenceBuffer);
      const img2 = PNG.sync.read(Buffer.from(screenshotBuffer));

      if (img1.width !== img2.width || img1.height !== img2.height) {
        console.warn('Screenshot dimension mismatch — visual test returns 0');
        results.push({
          pageName,
          diffPercent: 100,
          diffScore: 0,
          studentScreenshotUrl,
          referenceScreenshotUrl: referencePage.url,
          diffImageUrl: null,
          error: 'Screenshot dimension mismatch'
        });
        continue;
      }

      toGrayscale(img1);
      toGrayscale(img2);

      const { width, height } = img1;
      const diff = new PNG({ width, height });
      const numMismatchedPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.15 });

      const totalPixels = width * height;
      const diffPercent = Math.round((numMismatchedPixels / totalPixels) * 10000) / 100;
      const diffScore = Math.max(0, 100 - diffPercent);

      let diffImageUrl = null;
      try {
        const diffBuffer = PNG.sync.write(diff);
        diffImageUrl = await uploadScreenshot(
          diffBuffer,
          `submissions/${assignmentId}`,
          `diff_${submissionId}_${referencePage.pageName.replace(/[^\w.-]+/g, '_')}`
        );
      } catch (err) {
        console.error('Failed to upload diff image:', err.message);
      }

      results.push({
        pageName,
        diffPercent,
        diffScore,
        studentScreenshotUrl,
        referenceScreenshotUrl: referencePage.url,
        diffImageUrl
      });
    }
  } finally {
    await context.close();
  }

  if (results.length === 0) return noBaseline;

  const mainResult = results.find((result) =>
    referencePages.find((pageRef) => pageRef.pageName === result.pageName)?.isMain
  ) || results[0];

  const avgDiffPercent = parseFloat(
    (results.reduce((sum, result) => sum + (result.diffPercent ?? 100), 0) / results.length).toFixed(2)
  );
  const avgDiffScore = parseFloat(
    (results.reduce((sum, result) => sum + (result.diffScore ?? 0), 0) / results.length).toFixed(2)
  );

  return {
    diffPercent: avgDiffPercent,
    diffScore: avgDiffScore,
    studentScreenshotUrl: mainResult.studentScreenshotUrl ?? null,
    referenceScreenshotUrl: mainResult.referenceScreenshotUrl ?? null,
    diffImageUrl: mainResult.diffImageUrl ?? null,
    tests: results
  };
}
