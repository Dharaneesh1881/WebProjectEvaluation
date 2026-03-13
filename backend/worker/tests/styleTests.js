import { enableRequestWhitelist } from '../networkPolicy.js';

async function setupPage(browser, url, allowedDomains = []) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await enableRequestWhitelist(page, allowedDomains);

  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  return { context, page };
}

export async function runStyleTests(browser, url, tests, allowedDomains = []) {
  const { context, page } = await setupPage(browser, url, allowedDomains);

  const results = [];
  for (const test of tests) {
    try {
      const value = await page.evaluate((sel, prop) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return window.getComputedStyle(el).getPropertyValue(prop);
      }, test.selector, test.property);

      const passed = value !== null && test.check(value);
      results.push({ name: test.name, passed, weight: test.weight, earned: passed ? test.weight : 0 });
    } catch {
      results.push({ name: test.name, passed: false, weight: test.weight, earned: 0 });
    }
  }

  await context.close();
  return results;
}
