#!/usr/bin/env node

import fs from 'fs-extra';
import { chromium } from 'playwright';

(async () => {
  const USERNAME    = 'sean-steefel';
  const PROFILE_URL = `https://learn.microsoft.com/en-us/users/${USERNAME}/achievements?tab=tab-modules`;

  console.log('🚀 Launching headless browser…');
  const browser = await chromium.launch();
  const page    = await browser.newPage({
    userAgent: 'github-actions[bot]',
  });

  // Array to hold the API payload once we see it
  let apiData = null;

  // Listen for any JSON response that looks like our badges API
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct  = response.headers()['content-type'] || '';
      // Adjust this filter if the path is slightly different
      if (
        ct.includes('application/json')
        && url.match(new RegExp(`/users/${USERNAME}/achievements`))
      ) {
        console.log(`🔎 Intercepted JSON from ${url}`);
        const json = await response.json();
        if (Array.isArray(json.items)) {
          apiData = json.items;
        }
      }
    } catch (e) {
      // ignore JSON parse failures
    }
  });

  console.log(`⏳ Navigating to ${PROFILE_URL}`);
  await page.goto(PROFILE_URL, { waitUntil: 'networkidle' });

  // If the UI uses a client-side tab click to fetch modules, uncomment:
  // console.log('🖱️ Clicking the Modules tab…');
  // await page.click('button[role="tab"][aria-controls="tab-modules"]');
  // await page.waitForTimeout(1000);

  // Give the page a moment to fire its XHR
  console.log('⌛ Waiting up to 30s for the Achievements API call…');
  const start = Date.now();
  while (apiData === null && Date.now() - start < 30000) {
    await page.waitForTimeout(500);
  }
  if (!apiData) {
    console.error('❌ Timed out waiting for badge data');
    await browser.close();
    process.exit(1);
  }

  console.log(`✅ API returned ${apiData.length} badges`);

  // Shape it exactly how you want
  const badges = apiData.map(i => ({
    title:  i.title,
    href:   `https://learn.microsoft.com${i.relativeUrl}`,
    img:    i.imageUrl,
    issued: i.completedDate || i.dateCompleted || '',
  }));

  await browser.close();
  console.log(`✅ Writing ${badges.length} badges to badges.json…`);
  await fs.writeJson('badges.json', badges, { spaces: 2 });
  console.log('✅ badges.json written');
})();
