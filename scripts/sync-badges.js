#!/usr/bin/env node

import axios from 'axios';
import fs    from 'fs';

(async () => {
  const apiUrl = 'https://learn.microsoft.com/api/learn/users/sean-steefel/achievements?%24top=100';
  console.log('⏳ Fetching achievements via Learn API…');

  const res = await axios.get(apiUrl, {
    headers: { 'User-Agent': 'github-actions[bot]' }
  });

  const items = res.data.items || [];
  console.log(`🔍 Found ${items.length} badges via API`);

  const badges = items.map(i => ({
    id:    i.id,
    title: i.title,
    url:   `https://learn.microsoft.com${i.relativeUrl}`,
    img:   i.imageUrl
  }));

  fs.writeFileSync('badges.json', JSON.stringify(badges, null, 2));
  console.log('✅ badges.json written');
})();
