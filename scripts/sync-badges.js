#!/usr/bin/env node
import fs from 'fs-extra';
import { chromium } from 'playwright';

(async () => {
  const PROFILE_URL =
    'https://learn.microsoft.com/en-us/users/sean-steefel/achievements?tab=tab-modules';

  console.log('🚀 Launching headless browser…');
  const browser = await chromium.launch();
  const page    = await browser.newPage({ userAgent: 'github-actions[bot]' });

  console.log(`⏳ Navigating to ${PROFILE_URL}`);
  await page.goto(PROFILE_URL, { waitUntil: 'networkidle' });

  console.log('⬇️ Scrolling to bottom…');
  await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let prev = 0;
    while (true) {
      window.scrollBy(0, document.body.scrollHeight);
      await wait(500);
      if (document.body.scrollHeight === prev) break;
      prev = document.body.scrollHeight;
    }
  });

  console.log('⌛ Waiting for badges to render…');
  await page.waitForSelector('time[datetime]', { timeout: 15000 });

  // ← Use the revised extraction here
  /* …paste the new $$eval block from above… */

})();
