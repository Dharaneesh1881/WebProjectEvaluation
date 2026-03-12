async function setupInteractivePage(browser, url) {
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

  // Intercept alert() BEFORE page loads so student JS doesn't block Puppeteer
  await page.evaluateOnNewDocument(() => {
    window._alertCalled = false;
    window._alertMessage = '';
    window.alert = (msg) => {
      window._alertCalled = true;
      window._alertMessage = String(msg || '');
    };
    window.confirm = () => true;
    window.prompt = () => '';
  });

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  return { context, page };
}

export async function runInteractionTests(browser, url, tests) {
  const results = [];

  for (const test of tests) {
    // Each interaction test gets a completely fresh page
    const { context, page } = await setupInteractivePage(browser, url);

    let passed = false;
    try {
      passed = await test.run(page);
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
