import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs-extra';

export async function runVisualTest(browser, url, baselinePath) {
  // Skip visual test if no baseline exists yet
  const baselineExists = await fs.pathExists(baselinePath);
  if (!baselineExists) {
    console.warn('No baseline screenshot found at', baselinePath, '— skipping visual test');
    return { diffPercent: 100, diffScore: 0 };
  }

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('file://') || u.startsWith('data:')) {
      req.continue();
    } else {
      req.abort();
    }
  });

  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });

  const screenshotBuffer = await page.screenshot({ fullPage: false });
  await context.close();

  const baselineBuffer = await fs.readFile(baselinePath);

  const img1 = PNG.sync.read(baselineBuffer);
  const img2 = PNG.sync.read(Buffer.from(screenshotBuffer));

  const width  = img1.width;
  const height = img1.height;

  // Resize img2 if dimensions differ
  let data2 = img2.data;
  if (img2.width !== width || img2.height !== height) {
    // Simple fallback: treat as 100% diff if dimensions mismatch
    return { diffPercent: 100, diffScore: 0 };
  }

  const diff = new PNG({ width, height });
  const numMismatchedPixels = pixelmatch(img1.data, data2, diff.data, width, height, {
    threshold: 0.1
  });

  const totalPixels = width * height;
  const diffPercent = (numMismatchedPixels / totalPixels) * 100;
  const diffScore = Math.max(0, 100 - diffPercent);

  return { diffPercent: Math.round(diffPercent * 100) / 100, diffScore };
}
