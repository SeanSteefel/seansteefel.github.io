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
  await page.goto(PROFILE_URL, { waitUntil: 'networkidle' });

  console.log('⌛ Waiting for the Achievements API response…');
  const apiResp = await page.waitForResponse(
    resp => resp.url().includes(`/api/learn/users/${USERNAME}/achievements`) 
         && resp.status() === 200,
    { timeout: 15000 }
  );

  const data  = await apiResp.json();
  const items = data.items || [];
  console.log(`🔍 API returned ${items.length} badges`);

  // Map the API items into your final shape
  const badges = items.map(i => ({
    title: i.title,
    href:  `https://learn.microsoft.com${i.relativeUrl}`,
    img:   i.imageUrl,
    issued: i.completedDate    // if that key is undefined, try i.dateCompleted
           || i.dateCompleted 
           || ''
  }));

  await browser.close();

  console.log(`✅ Writing ${badges.length} badges to badges.json…`);
  await fs.writeJson('badges.json', badges, { spaces: 2 });
  console.log('✅ badges.json written');
})();
