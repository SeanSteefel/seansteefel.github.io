#!/usr/bin/env node

import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';

(async () => {
  const url = 'https://learn.microsoft.com/en-us/users/sean-steefel/achievements?tab=tab-modules';
  console.log('⏳ Fetching achievements page...');
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'GitHub-Action' }
  });
  const html = res.data;

  // Load the HTML into Cheerio
  const $ = load(html);

  // Grab the __NEXT_DATA__ JSON blob
  const raw = $('#__NEXT_DATA__').html();
  if (!raw) {
    console.error('❌ __NEXT_DATA__ block not found');
    process.exit(1);
  }

  // Parse and drill into the achievements array
  const nextData = JSON.parse(raw);
  const items = nextData.props?.pageProps?.userAchievements?.items || [];
  console.log(`🔍 Found ${items.length} badges in NEXT_DATA`);

  // Map to the shape you want in badges.json
  const badges = items.map(i => ({
    id:    i.id,
    title: i.title,
    url:   `https://learn.microsoft.com${i.relativeUrl}`,
    img:   i.imageUrl
  }));

  // Write out badges.json
  fs.writeFileSync('badges.json', JSON.stringify(badges, null, 2));
  console.log('✅ badges.json written');
})();
