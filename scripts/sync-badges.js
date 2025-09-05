// scripts/sync-badges-public.js

import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const ACHIEVEMENTS_URL =
  process.env.ACHIEVEMENTS_URL ||
  'https://learn.microsoft.com/users/sean-steefel/achievements?tab=tab-modules';
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'badges.json');

async function scrapeBadges(page) {
  // Wait for badge cards container to appear
  await page.waitForSelector('a[aria-label^="Print your achievement"]', {
    timeout: 10_000
  });

  // Extract every “Print your achievement” link
  return page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[aria-label^="Print your achievement"]')
    );

    return anchors.map(a => {
      const issuedMatch = /Completed on\s*([\d/]+)/i.exec(a.textContent);
      const issued      = issuedMatch?.[1] || '';

      const imgEl = a.querySelector('img');
      const href  = a.href;

      const aria  = a.getAttribute('aria-label') || '';
      const title = (aria.match(/for\s+(.+)$/i)?.[1] || imgEl?.alt || '').trim();

      return { title, href, img: imgEl?.src || '', issued };
    });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  try {
    await page.goto(ACHIEVEMENTS_URL, { waitUntil: 'networkidle' });
    const badges = await scrapeBadges(page);

    // Ensure output directory exists
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(badges, null, 2));

    console.log(`✅ Found ${badges.length} badges and saved to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('❌ Scrape failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
