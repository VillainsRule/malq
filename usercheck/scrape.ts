import fs from 'fs';
import path from 'path';

import { connect } from 'puppeteer-real-browser';

import wafFetch from '../src/util/waf/fetch';

console.log('need to solve the captcha. this may be a second.');

const { page, browser } = await connect({
    headless: false,
    turnstile: true,
});

await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36');
await page.goto('https://usercheck.com/providers');

let x = await new Promise<string>((resolve) => {
    let i = setInterval(async () => {
        const cookies = await browser.cookies();
        const cfClearance = cookies.find(c => c.name === 'cf_clearance');
        if (cfClearance) {
            clearInterval(i);
            resolve(`${cfClearance.name}=${cfClearance.value}`);
        }
    }, 100);
});

browser.close();

console.log('captcha solved');

const providers: { name: string, domainCount: number, page: number }[] = [];

for (let i = 0; i < 20; i++) {
    const req = await wafFetch('https://www.usercheck.com/providers?page=' + (i + 1), {
        headers: { 'Cookie': x },
        noProxy: true
    });

    const res = req.text();

    const matches = res.matchAll(/<div class="font-mono text-2xl font-medium text-primary-900">\s*([^<\s]+)\s*<\/div>\s*<div class="text-gray-700">\s*([\d,]+) domains\s*<\/div>/g);
    providers.push(...Array.from(matches, m => ({ name: m[1], domainCount: parseInt(m[2].replace(/,/g, '')), page: i + 1 })));

    console.log('scraped page', i + 1);
}

fs.writeFileSync(path.join(import.meta.dirname, 'out.json'), JSON.stringify(providers, null, 4));
console.log('done!');