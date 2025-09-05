// scripts/sync-badges-public.js

import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = process.env.ACHIEVEMENTS_URL
  || 'https://learn.microsoft.com/users/sean-steefel/achievements';
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'badges.json');

async function scrapeBadges(page) {
  // Give the page time to render everything
  await page.waitForLoadState('networkidle');

  // If the Modules tab isn’t auto-selected, click it
  const modulesTab = page.locator('button:has-text("Modules")');
  if (await modulesTab.count()) {
    await modulesTab.first().click();
  }

  // Scroll down to trigger any lazy-loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Wait up to 30s for badge links to appear
  await page.waitForSelector('a[aria-label^="Print your achievement"]', {
    timeout: 30_000
  });

  // Extract badge data
  return page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[aria-label^="Print your achievement"]')
    );
    return anchors.map(a => {
      const issuedMatch = /Completed on\s*([\d/]+)/i.exec(a.textContent || '');
      const issued = issuedMatch?.[1] || '';

      const imgEl = a.querySelector('img');
      const href  = a.href;

      // aria-label is “Print your achievement for <title>”
      const aria   = a.getAttribute('aria-label') || '';
      const title  = (aria.match(/for\s+(.+)$/i)?.[1] || imgEl?.alt || '')
                      .trim();

      return { title, href, img: imgEl?.src || '', issued };
    });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const badges = await scrapeBadges(page);

    // Persist to JSON
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(badges, null, 2));

    console.log(`✅ Scraped ${badges.length} badges → ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('❌ Scrape failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
