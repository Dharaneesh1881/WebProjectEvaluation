/**
 * JSON-based interaction test runner.
 * Tests are stored in MongoDB as plain objects (no functions).
 *
 * Test spec format:
 * {
 *   name: String,
 *   weight: Number,
 *   steps: [{ action: 'click'|'type'|'keypress', selector?: String, value?: String, key?: String }],
 *   assertions: [{ type: 'alertCalled'|'textChanged'|'textContains'|'elementExists'|'countEquals',
 *                  selector?: String, value?: String, oldText?: String }]
 * }
 */

import { enableRequestWhitelist } from '../networkPolicy.js';

async function setupInteractivePage(browser, url, allowedDomains = []) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await enableRequestWhitelist(page, allowedDomains);

  await page.evaluateOnNewDocument(() => {
    window._alertCalled = false;
    window._alertMessage = '';
    window.alert   = (msg) => { window._alertCalled = true; window._alertMessage = String(msg || ''); };
    window.confirm = () => true;
    window.prompt  = () => '';
  });

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  return { context, page };
}

async function runStep(page, step) {
  if (step.action === 'click') {
    await page.click(step.selector);
  } else if (step.action === 'type') {
    await page.click(step.selector);
    await page.type(step.selector, step.value || '');
  } else if (step.action === 'keypress') {
    await page.keyboard.press(step.key || 'Enter');
  }
  await new Promise(r => setTimeout(r, 150));
}

async function checkAssertion(page, assertion) {
  return page.evaluate((a) => {
    if (a.type === 'alertCalled')   return window._alertCalled;
    if (a.type === 'elementExists') return !!document.querySelector(a.selector);
    if (a.type === 'textContains') {
      const el = document.querySelector(a.selector);
      return el ? el.textContent.includes(a.value) : false;
    }
    if (a.type === 'textChanged') {
      const el = document.querySelector(a.selector);
      return el ? el.textContent.trim() !== a.oldText : false;
    }
    if (a.type === 'countEquals') {
      return document.querySelectorAll(a.selector).length === parseInt(a.value);
    }
    return false;
  }, assertion);
}

export async function runInteractionTests(browser, url, tests, allowedDomains = []) {
  const results = [];

  for (const test of tests) {
    const { context, page } = await setupInteractivePage(browser, url, allowedDomains);
    let passed = false;

    try {
      for (const step of (test.steps || [])) {
        await runStep(page, step);
      }
      let allPassed = true;
      for (const assertion of (test.assertions || [])) {
        const ok = await checkAssertion(page, assertion);
        if (!ok) { allPassed = false; break; }
      }
      passed = allPassed;
    } catch (err) {
      console.warn(`Interaction test "${test.name}" threw:`, err.message);
      passed = false;
    } finally {
      await context.close();
    }

    results.push({ name: test.name, passed, weight: test.weight, earned: passed ? test.weight : 0 });
  }

  return results;
}
