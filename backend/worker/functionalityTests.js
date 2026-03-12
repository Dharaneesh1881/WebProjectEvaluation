/**
 * functionalityTests.js  — 40-mark Behavior Contract Engine
 *
 * Teacher defines what the app should DO (not what it should contain).
 * Each test: run steps → read values → assert → pass/fail → earn marks.
 *
 * Test case schema stored in MongoDB:
 * {
 *   id:       String,
 *   name:     String,
 *   marks:    Number,
 *   steps:    [{ action, selector?, value?, saveAs?, key?, ms? }],
 *   assert:   { type, selector?, value?, from?, to?, by?, min?, max?,
 *               className?, messageContains? },
 *   failHint: String
 * }
 *
 * Supported step actions:
 *   click, type, read, clear, select, keypress, wait
 *
 * Supported assertion types:
 *   textContains, textEquals, incrementedBy, decrementedBy,
 *   valueChanged, countEquals, countIncreasedBy, isVisible,
 *   isHidden, hasClass, alertCalled, inputValueEquals, inputCleared,
 *   valueInRange, elementExists
 */

// ── Page setup for each test case (fresh isolated context) ────────────────
async function createFreshPage(browser, fileUrl) {
  const context = await browser.createBrowserContext();
  const page    = await context.newPage();

  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    (u.startsWith('file://') || u.startsWith('data:')) ? req.continue() : req.abort();
  });

  // Override dialogs — capture but don't block execution
  const capturedDialogs = [];
  page.on('dialog', async dialog => {
    capturedDialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss();
  });

  // Also stub alert/confirm/prompt via JS so any inline calls are captured
  await page.evaluateOnNewDocument(() => {
    window._dialogs = [];
    window.alert   = msg => window._dialogs.push({ type: 'alert',   message: String(msg ?? '') });
    window.confirm = msg => { window._dialogs.push({ type: 'confirm', message: String(msg ?? '') }); return true; };
    window.prompt  = msg => { window._dialogs.push({ type: 'prompt',  message: String(msg ?? '') }); return ''; };
  });

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 8000 });
  await new Promise(r => setTimeout(r, 300));

  return { context, page, capturedDialogs };
}

// ── Execute a single step ──────────────────────────────────────────────────
async function executeStep(page, step, savedValues) {
  const sel = step.selector;

  switch (step.action) {

    case 'click':
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.click(sel);
      await new Promise(r => setTimeout(r, 200));
      return { action: 'click', selector: sel, status: 'ok' };

    case 'type':
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.click(sel, { clickCount: 3 }); // select-all before typing
      await page.type(sel, step.value ?? '', { delay: 20 });
      await new Promise(r => setTimeout(r, 100));
      return { action: 'type', selector: sel, value: step.value, status: 'ok' };

    case 'read': {
      await page.waitForSelector(sel, { timeout: 3000 });
      const text = await page.$eval(sel, el => el.textContent.trim());
      savedValues[step.saveAs] = text;
      return { action: 'read', selector: sel, savedAs: step.saveAs, value: text, status: 'ok' };
    }

    case 'clear':
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.$eval(sel, el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
      return { action: 'clear', selector: sel, status: 'ok' };

    case 'select':
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.select(sel, step.value ?? '');
      await new Promise(r => setTimeout(r, 100));
      return { action: 'select', selector: sel, value: step.value, status: 'ok' };

    case 'keypress':
      await page.keyboard.press(step.key ?? 'Enter');
      await new Promise(r => setTimeout(r, 100));
      return { action: 'keypress', key: step.key, status: 'ok' };

    case 'wait':
      await new Promise(r => setTimeout(r, step.ms ?? 500));
      return { action: 'wait', ms: step.ms, status: 'ok' };

    default:
      return { action: step.action, status: 'unknown' };
  }
}

// ── Run the assertion ──────────────────────────────────────────────────────
async function runAssertion(page, assert, savedValues) {
  try {
    switch (assert.type) {

      // Element text contains any of the given values
      case 'textContains': {
        const el = await page.$(assert.selector);
        if (!el) return false;
        const text = (await page.$eval(assert.selector, el => el.textContent)).toLowerCase();
        const vals = Array.isArray(assert.value) ? assert.value : [assert.value];
        return vals.some(v => text.includes(String(v).toLowerCase()));
      }

      // Element text matches exactly
      case 'textEquals': {
        const el = await page.$(assert.selector);
        if (!el) return false;
        const text = await page.$eval(assert.selector, el => el.textContent.trim());
        return text === String(assert.value);
      }

      // Saved numeric value went UP by assert.by
      case 'incrementedBy': {
        const before = parseFloat(savedValues[assert.from]);
        const after  = parseFloat(savedValues[assert.to]);
        if (isNaN(before) || isNaN(after)) return false;
        return Math.abs((after - before) - assert.by) < 0.001;
      }

      // Saved numeric value went DOWN by assert.by
      case 'decrementedBy': {
        const before = parseFloat(savedValues[assert.from]);
        const after  = parseFloat(savedValues[assert.to]);
        if (isNaN(before) || isNaN(after)) return false;
        return Math.abs((before - after) - assert.by) < 0.001;
      }

      // Saved value changed at all (any direction)
      case 'valueChanged':
        return savedValues[assert.from] !== savedValues[assert.to];

      // Number of matching DOM elements equals N
      case 'countEquals': {
        const count = await page.$$eval(assert.selector, els => els.length);
        return count === assert.value;
      }

      // Count of elements increased by N compared to saved value
      case 'countIncreasedBy': {
        const before = parseInt(savedValues[assert.from]);
        const after  = await page.$$eval(assert.selector, els => els.length);
        if (isNaN(before)) return false;
        return (after - before) === assert.by;
      }

      // Element is visible on page
      case 'isVisible': {
        const el = await page.$(assert.selector);
        if (!el) return false;
        return await page.$eval(assert.selector, el => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        });
      }

      // Element is hidden or does not exist
      case 'isHidden': {
        const el = await page.$(assert.selector);
        if (!el) return true;
        return await page.$eval(assert.selector, el => {
          const s = window.getComputedStyle(el);
          return s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0';
        });
      }

      // Element has a specific CSS class
      case 'hasClass': {
        const el = await page.$(assert.selector);
        if (!el) return false;
        return await page.$eval(assert.selector, (el, cls) => el.classList.contains(cls), assert.className);
      }

      // alert() / confirm() / prompt() was called (via JS stub OR Puppeteer dialog)
      case 'alertCalled': {
        const called = await page.evaluate(() => window._dialogs.length > 0);
        if (!called) return false;
        if (!assert.messageContains) return true;
        return await page.evaluate(
          (needle) => window._dialogs.some(d => d.message.toLowerCase().includes(needle.toLowerCase())),
          assert.messageContains
        );
      }

      // Input field value equals expected string
      case 'inputValueEquals': {
        const val = await page.$eval(assert.selector, el => el.value);
        return val === String(assert.value);
      }

      // Input field is empty (cleared / reset)
      case 'inputCleared': {
        const val = await page.$eval(assert.selector, el => el.value);
        return val === '' || val == null;
      }

      // Numeric text value is within [min, max]
      case 'valueInRange': {
        const text = await page.$eval(assert.selector, el => el.textContent.trim());
        const num  = parseFloat(text);
        return !isNaN(num) && num >= assert.min && num <= assert.max;
      }

      // Element exists in the DOM
      case 'elementExists': {
        const el = await page.$(assert.selector);
        return el !== null;
      }

      default:
        console.warn(`[functionalityTests] Unknown assertion type: ${assert.type}`);
        return false;
    }
  } catch {
    return false;
  }
}

// ── Main: run all test cases ───────────────────────────────────────────────
export async function runFunctionalityTests(browser, fileUrl, testCases) {
  // If no tests defined, return 0 earned / 40 max
  if (!testCases || testCases.length === 0) {
    return { tests: [], earned: 0, score: 0, maxScore: 40, rawMax: 0 };
  }

  const results  = [];
  let   rawEarned = 0;
  const rawMax    = testCases.reduce((sum, t) => sum + (t.marks || 0), 0);

  for (const testCase of testCases) {
    const caseResult = {
      id:       testCase.id   || '',
      name:     testCase.name || 'Unnamed test',
      marks:    testCase.marks || 0,
      earned:   0,
      passed:   false,
      failHint: testCase.failHint || '',
      steps:    [],
      error:    null
    };

    let context = null;
    let page    = null;

    try {
      ({ context, page } = await createFreshPage(browser, fileUrl));
      const savedValues = {};

      // Execute steps one by one; continue even if a step fails
      for (const step of (testCase.steps || [])) {
        try {
          const stepResult = await executeStep(page, step, savedValues);
          caseResult.steps.push(stepResult);
        } catch (stepErr) {
          caseResult.steps.push({
            action:   step.action,
            selector: step.selector,
            status:   'failed',
            error:    stepErr.message
          });
        }
      }

      // Run assertion
      const passed = await runAssertion(page, testCase.assert || {}, savedValues);
      caseResult.passed = passed;
      caseResult.earned = passed ? (testCase.marks || 0) : 0;
      rawEarned += caseResult.earned;

    } catch (err) {
      caseResult.error  = err.message;
      caseResult.passed = false;
      caseResult.earned = 0;
    } finally {
      if (context) await context.close().catch(() => {});
    }

    results.push(caseResult);
  }

  // Scale earned marks to 40-mark bucket
  // e.g. teacher defined 50 marks total → scale to 40
  const scaledScore = rawMax > 0
    ? parseFloat(((rawEarned / rawMax) * 40).toFixed(2))
    : 0;

  return {
    tests:    results,
    earned:   rawEarned,
    score:    scaledScore,   // ← final score out of 40
    maxScore: 40,
    rawMax                   // teacher's defined total marks
  };
}
