#!/usr/bin/env node

import fs from 'fs-extra';
import { chromium } from 'playwright';

(async () => {
  const PROFILE_URL = 'https://learn.microsoft.com/en-us/users/sean-steefel/achievements';

  console.log('🚀 Launching headless browser…');
  const browser = await chromium.launch();
  const page    = await browser.newPage({
    userAgent: 'github-actions[bot]',
  });

  console.log(`⏳ Navigating to ${PROFILE_URL}`);
  await page.goto(PROFILE_URL, { waitUntil: 'networkidle' });

  // Scroll slowly to bottom to trigger lazy loading
  await page.evaluate(async () => {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    let lastHeight = 0;
    for (let i = 0; i < 10; i++) {
      window.scrollBy(0, document.body.scrollHeight);
      await delay(500);
      if (document.body.scrollHeight === lastHeight) break;
      lastHeight = document.body.scrollHeight;
    }
  });

  // Wait for all badge images to appear
  await page.waitForSelector('a[href*="/training/achievements/"] img[src*="cdn.learn.microsoft.com"]', { timeout: 10000 });

  // Extract badge data
  const badges = await page.$$eval(
    'a[href*="/training/achievements/"]',
    cards => cards.map(card => {
      const linkEl = card;
      const imgEl  = card.querySelector('img');
      const dateEl = card.closest('li,div[role="listitem"]') 
                   ?.querySelector('time') 
                   || card.querySelector('p:has(text("Completed on"))');
      
      return {
        title: linkEl.getAttribute('title')?.trim() || imgEl.alt || '',
        href:  linkEl.href,
        img:   imgEl?.src || '',
        issued: dateEl?.getAttribute('datetime') 
             || dateEl?.textContent?.trim().replace(/^Completed on\s*/, '') 
             || ''
      };
    })
  );

  await browser.close();

  console.log(`🔍 Found ${badges.length} badges`);
  await fs.writeJson('badges.json', badges, { spaces: 2 });
  console.log('✅ badges.json written');
})();
