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
    const delay = ms => new Promise(r => setTimeout(r, ms));
    let prevHeight = 0;
    while (true) {
      window.scrollBy(0, document.body.scrollHeight);
      await delay(500);
      if (document.body.scrollHeight === prevHeight) break;
      prevHeight = document.body.scrollHeight;
    }
  });

  console.log('⌛ Waiting for badges to render…');
  await page.waitForSelector('time[datetime]', { timeout: 15000 });

  console.log('🔎 Extracting badge data…');
  const badges = await page.$$eval('time[datetime]', times =>
    times.map(timeEl => {
      const issued =
        timeEl.getAttribute('datetime')?.trim() ||
        timeEl.textContent.trim();

      const card = timeEl.closest('li, div');

      const linkEl =
        card.querySelector('a[aria-label^="Print your achievement"]') ||
        card.querySelector('a[href*="/training/achievements/"]') ||
        {};

      const imgEl = card.querySelector('img');
      const title = imgEl?.alt?.trim() || '';

      return {
        title,
        href: linkEl.href || '',
        img: imgEl?.src || '',
        issued
      };
    })
  );

  await browser.close();
  console.log(`✅ Found ${badges.length} badges.`);
  await fs.writeJson('badges.json', badges, { spaces: 2 });
  console.log('✅ badges.json written');
})();
