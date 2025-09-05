// scripts/sync-badges.js
import fs from 'fs';
import axios from 'axios';
import { load } from 'cheerio';


const PROFILE_URL = 'https://learn.microsoft.com/en-us/users/sean-steefel/achievements';

async function fetchHTML(url) {
  const res = await axios.get(url, { headers: { 'User-Agent': 'GitHub-Action' } });
  return res.data;
}

async function scrape() {
  console.log('⏳ Fetching achievements page...');
  const listHtml = await fetchHTML(PROFILE_URL);
  const $ = load(listHtml);

  // Grab every achievement link
  const links = new Set();
  $('a[href*="/training/achievements/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href.startsWith('https://learn.microsoft.com')) links.add(href);
    else if (href.startsWith('/')) links.add('https://learn.microsoft.com' + href);
  });

  const badges = [];
  console.log(`Found ${links.size} achievement links`);

  for (const link of links) {
    try {
      const html = await fetchHTML(link);
      const $$ = load(html);

      // Title cleanup
      let title = $$('meta[property="og:title"]').attr('content')
        || $$('h1').first().text();
      title = title.replace(/\s*\|\s*Microsoft Learn\s*$/, '').trim();

      // Image URL
      const img = $$('meta[property="og:image"]').attr('content')
        || $$('img[src*="cdn.learn.microsoft.com"]').first().attr('src') 
        || '';

      // Date: parse the “Completed on” label if present
      const dateText = listHtml.match(new RegExp(
        title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        + '[\\s\\S]{0,100}?Completed on\\s*(\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})'
      ));
      const issued = dateText ? new Date(dateText[1]).toISOString().slice(0,10) : '';

      // Tag heuristics
      const t = title.toLowerCase();
      const tags = [];
      if (/\bpower(shell)?\b/.test(t)) tags.push('PowerShell');
      if (/\barm template|bicep|resource manager\b/.test(t)) tags.push('IaC');
      if (/\bazure arc\b/.test(t)) tags.push('Azure Arc');
      if (/\bcli|bash|shell\b/.test(t)) tags.push('CLI');
      if (/devops|pipelines|artifacts|tests/.test(t)) tags.push('Azure DevOps');
      if (!tags.length) tags.push('Azure');

      badges.push({ title, href: link, img, issued, tags });
      console.log(`✔️  ${title}`);
    } catch (err) {
      console.warn(`❌  Failed ${link}: ${err.message}`);
    }
  }

  // Sort by date desc
  badges.sort((a,b) => (b.issued||'').localeCompare(a.issued||''));
  fs.writeFileSync('badges.json', JSON.stringify(badges, null, 2));
  console.log('✅ badges.json written');
}

scrape().catch(err => {
  console.error(err);
  process.exit(1);
});
