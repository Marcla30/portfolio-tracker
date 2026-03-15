#!/usr/bin/env node
// Diagnose Yahoo Finance connectivity from inside the container.
// Usage: docker compose exec app node scripts/test-yahoo.js

const axios = require('axios');

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
};

const SYMBOLS = ['AI.PA', 'GC=F', 'MC.PA', 'PE500.PA'];

(async () => {
  // Step 1: crumb
  let crumb = '', cookie = '';
  try {
    process.stdout.write('Fetching Yahoo consent cookie... ');
    const cookieRes = await axios.get('https://fc.yahoo.com', {
      headers: YAHOO_HEADERS, timeout: 10000, maxRedirects: 5, validateStatus: () => true
    });
    const setCookies = cookieRes.headers['set-cookie'] || [];
    cookie = setCookies.map(c => c.split(';')[0]).join('; ');
    console.log(cookie ? `OK (${setCookies.length} cookies)` : 'no cookies returned');

    process.stdout.write('Fetching crumb... ');
    const crumbRes = await axios.get('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...YAHOO_HEADERS, Cookie: cookie }, timeout: 10000
    });
    crumb = typeof crumbRes.data === 'string' ? crumbRes.data.trim() : '';
    console.log(crumb ? `OK: "${crumb}"` : `EMPTY (status ${crumbRes.status})`);
  } catch (e) {
    console.log(`FAILED: ${e.response?.status ?? e.message}`);
  }

  console.log('');

  // Step 2: test chart requests
  for (const sym of SYMBOLS) {
    const headers = cookie ? { ...YAHOO_HEADERS, Cookie: cookie } : YAHOO_HEADERS;
    const params = crumb ? { crumb } : {};
    for (const host of ['query1', 'query2']) {
      process.stdout.write(`  ${host} ${sym.padEnd(12)} `);
      try {
        const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${sym}`;
        const r = await axios.get(url, { headers, params, timeout: 10000 });
        const price = r.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        const currency = r.data?.chart?.result?.[0]?.meta?.currency;
        console.log(`OK: ${price} ${currency}`);
        break; // query1 worked, skip query2
      } catch (e) {
        console.log(`FAILED: ${e.response?.status ?? e.message}`);
      }
    }
  }
})();
