import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { uploadScreenshot, downloadImageAsBuffer } from '../utils/cloudinary.js';

export async function runVisualTest(browser, url, submissionId, assignmentId, referenceScreenshotUrl) {
  const noBaseline = { diffPercent: 100, diffScore: 0, studentScreenshotUrl: null, referenceScreenshotUrl: null, diffImageUrl: null };

  if (!referenceScreenshotUrl) {
    console.warn('No reference screenshot URL — skipping visual test');
    return noBaseline;
  }

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('file://') || u.startsWith('data:')) req.continue();
    else req.abort();
  });

  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'
  });
  await new Promise(r => setTimeout(r, 300));

  const screenshotBuffer = await page.screenshot({ fullPage: false });
  await context.close();

  // Upload student screenshot to Cloudinary
  let studentScreenshotUrl = null;
  try {
    studentScreenshotUrl = await uploadScreenshot(
      Buffer.from(screenshotBuffer),
      `submissions/${assignmentId}`,
      `student_${submissionId}`
    );
  } catch (err) {
    console.error('Failed to upload student screenshot:', err.message);
  }

  // Download reference image from Cloudinary
  let referenceBuffer;
  try {
    referenceBuffer = await downloadImageAsBuffer(referenceScreenshotUrl);
  } catch (err) {
    console.error('Failed to download reference screenshot:', err.message);
    return { ...noBaseline, studentScreenshotUrl };
  }

  const img1 = PNG.sync.read(referenceBuffer);
  const img2 = PNG.sync.read(Buffer.from(screenshotBuffer));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.warn('Screenshot dimension mismatch — visual test returns 0');
    return { diffPercent: 100, diffScore: 0, studentScreenshotUrl, referenceScreenshotUrl, diffImageUrl: null };
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });
  const numMismatchedPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });

  const totalPixels = width * height;
  const diffPercent = Math.round((numMismatchedPixels / totalPixels) * 10000) / 100;
  const diffScore = Math.max(0, 100 - diffPercent);

  // Upload diff image to Cloudinary
  let diffImageUrl = null;
  try {
    const diffBuffer = PNG.sync.write(diff);
    diffImageUrl = await uploadScreenshot(
      diffBuffer,
      `submissions/${assignmentId}`,
      `diff_${submissionId}`
    );
  } catch (err) {
    console.error('Failed to upload diff image:', err.message);
  }

  return { diffPercent, diffScore, studentScreenshotUrl, referenceScreenshotUrl, diffImageUrl };
}
