#!/usr/bin/env node

import fs from 'fs-extra';
import { chromium } from 'playwright';

(async () => {
  // 1) Point at the Modules tab so we see badges instead of profile header
  const PROFILE_URL =
    'https://learn.microsoft.com/en-us/users/sean-steefel/achievements?tab=tab-modules';

  console.log('🚀 Launching headless browser…');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    userAgent: 'github-actions[bot]'
  });

  console.log(`⏳ Navigating to ${PROFILE_URL}`);
  await page.goto(PROFILE_URL, { waitUntil: 'networkidle' });

  // 2) Scroll to bottom to load everything
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

  // 3) Wait for at least one completion date to appear
  console.log('⌛ Waiting for badges to render…');
  await page.waitForSelector('time[datetime]', { timeout: 15000 });

  // 4) Extract all badges
  console.log('🔎 Extracting badge data…');
  const badges = await page.$$eval('time[datetime]', times =>
    times.map(timeEl => {
      // issued date
      const issued = timeEl.getAttribute('datetime')?.trim() ||
                     timeEl.textContent.trim();

      // the surrounding card container
      const card = timeEl.closest(
        'li, div[role="listitem"], div[class*="achievement-"]'
      );

      // print link anchor (strongest source for title+href)
      const link =
        card.querySelector('a[aria-label^="Print your achievement"]') ||
        card.querySelector('a[href*="/training/achievements/"]') ||
        {};

      // href
      const href = link.href || '';

      // derive title from aria-label: "Print your achievement for XXX"
      let title = '';
      if (link.getAttribute) {
        const aria = link.getAttribute('aria-label') || '';
        const m = aria.match(/for\s+(.+)$/i);
        if (m) title = m[1].trim();
      }

      // fallback: any heading or badge-label text
      if (!title) {
        const heading = card.querySelector('h3, h4, h2, strong, .ms-fontWeight-semibold');
        title = heading?.textContent?.trim() || '';
      }

      // image URL: prefer <img>, else background-image
      let img = '';
      const imgEl = card.querySelector('img');
      if (imgEl && imgEl.src) {
        img = imgEl.src;
      } else {
        const styled = card.querySelector('[style*="background-image"]');
        if (styled) {
          const style = styled.getAttribute('style') || '';
          const match = style.match(/url\(["']?(.*?)["']?\)/i);
          img = match?.[1] || '';
        }
      }

      return { title, href, img, issued };
    })
  );

  await browser.close();

  console.log(`✅ Found ${badges.length} badges.`);
  
  // 5) Write JSON
  await fs.writeJson('badges.json', badges, { spaces: 2 });
  console.log('✅ badges.json written');
})();
