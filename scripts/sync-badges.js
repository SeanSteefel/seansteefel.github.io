#!/usr/bin/env node

import fs from 'fs-extra';
import { chromium } from 'playwright';

(async () => {
  const USERNAME    = 'sean-steefel';
  const PROFILE_URL = `https://learn.microsoft.com/en-us/users/${USERNAME}/achievements?tab=tab-modules`;

  console.log('🚀 Launching headless browser…');
  const browser = await chromium.launch();
  const page    = await browser.newPage({
    userAgent: 'github-actions[bot]'
  });

  console.log(`⏳ Navigating to ${PROFILE_URL}`);
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });

  console.log('⌛ Ensuring HTML is painted and any inline JSON is present…');
  await page.waitForTimeout(2000);

  console.log('🔎 Extracting badges via two-step strategy');
  const badges = await page.evaluate(() => {
    // 1) Try Next.js __NEXT_DATA__ JSON
    try {
      const nextDataScript = document.querySelector('#__NEXT_DATA__');
      if (nextDataScript) {
        const data = JSON.parse(nextDataScript.textContent);
        const items = data.props?.pageProps?.achievements?.items;
        if (Array.isArray(items) && items.length) {
          return items.map(i => ({
            title:  i.title,
            href:   `https://learn.microsoft.com${i.relativeUrl}`,
            img:    i.imageUrl,
            issued: i.completedDate || i.dateCompleted || ''
          }));
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    // 2) Fallback: scrape the DOM under the Modules section
    const anchors = Array.from(
      document
        .querySelector('#trophies-section')
        ?.querySelectorAll('a:has(img)')
      || []
    );

    return anchors.map(a => {
      const imgEl   = a.querySelector('img');
      const titleEl = a.querySelector('span')
                    ?? a.querySelector('h3')
                    ?? imgEl;
      const text    = a.textContent.trim();
      const match   = /Completed on\s*([\d/]+)/.exec(text);
      return {
        title:  (titleEl?.textContent || imgEl?.alt || '').trim(),
        href:   a.href,
        img:    imgEl?.src || '',
        issued: match?.[1] || ''
      };
    });
  });

  // Dump out exactly what was extracted
  console.log('📦 Raw extracted badges:');
  console.log(JSON.stringify(badges, null, 2));

  await browser.close();

  if (!Array.isArray(badges) || badges.length === 0) {
    console.error('❌ No badges found. Unable to update badges.json.');
    process.exit(1);
  }

  console.log(`✅ Extracted ${badges.length} badges, writing to badges.json…`);
  await fs.writeJson('badges.json', badges, { spaces: 2 });
  console.log('✅ badges.json written');
})();
