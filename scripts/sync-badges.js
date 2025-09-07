#!/usr/bin/env node

import fs from 'fs-extra';
import { chromium } from 'playwright';

(async () => {
  const URL =
    'https://learn.microsoft.com/en-us/users/sean-steefel/achievements?tab=tab-modules';

  console.log(`🚀 Launching headless browser…`);
  const browser = await chromium.launch();
  const page    = await browser.newPage({
    userAgent: 'github-actions[bot]'
  });

  console.log(`⏳ Navigating to ${URL}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  console.log('⌛ Waiting for section#tabpanel-modules to appear…');
  await page.waitForSelector('section#tabpanel-modules', { timeout: 10000 });

  console.log('🔎 Extracting badges from #tabpanel-modules…');
  const badges = await page.evaluate(() => {
    const section = document.querySelector('section#tabpanel-modules');
    if (!section) return [];

    const items = Array.from(section.querySelectorAll('li'));
    return items.map(li => {
      const imgEl = li.querySelector('img');
      const linkEl = li.querySelector('a');

      const title = imgEl?.alt?.trim() || '';
      const href  = linkEl?.href || '';
      const img   = imgEl?.src || '';

      // Find the first date in MM/DD/YYYY format in the item’s text
      const text = li.textContent || '';
      const m    = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      const issued = m ? m[1] : '';

      return { title, href, img, issued };
    });
  });

  await browser.close();

  if (!Array.isArray(badges) || badges.length === 0) {
    console.error('❌ No badges found in section#tabpanel-modules. Exiting.');
    process.exit(1);
  }

  console.log(`✅ Found ${badges.length} badges.`);
  console.log('📦 Raw extracted badges:', JSON.stringify(badges, null, 2));

  await fs.writeJson('badges.json', badges, { spaces: 2 });
  console.log('✅ badges.json written');
})();
