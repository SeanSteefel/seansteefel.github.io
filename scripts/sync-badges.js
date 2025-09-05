// scripts/sync-badges-via-xhr.js

import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const USERNAME    = process.env.MSLEARN_USER || 'sean-steefel';
const BASE_URL    = `https://learn.microsoft.com/users/${USERNAME}/achievements?tab=tab-modules`;
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'badges.json');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  let badges = [];

  // 1) Catch the JSON XHR that returns your modules badges
  page.on('response', async response => {
    const url = response.url();
    // adjust this pattern if Microsoft renames their endpoint
    if (url.includes('/achievements') && response.request().resourceType() === 'xhr') {
      try {
        const payload = await response.json();
        // payload shape may vary—inspect via console.log(payload)
        badges = (payload.achievements || payload.items || []).map(item => ({
          title : item.trophyName    || item.name        || '',
          href  : item.links?.print  || item.printerUrl || '',
          img   : item.badgeImageUri || item.image?.uri || '',
          issued: item.completedDate || item.completedAt  || ''
        }));
      } catch (e) {
        // non-JSON responses get filtered out
      }
    }
  });

  // 2) Drive the page to fire that XHR
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // 3) Give it a couple extra seconds for the badge-fetch to happen
  await page.waitForTimeout(3_000);

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(badges, null, 2));

  console.log(`✅ Fetched ${badges.length} badges via XHR → ${OUTPUT_FILE}`);

  await browser.close();
}

main().catch(err => {
  console.error('❌ Badge fetch failed:', err);
  process.exit(1);
});
