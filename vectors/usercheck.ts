const IGNORE_LIST: string[] = [];

const THRESHOLD = 10;
const DELAY = 750;

import fs from 'fs';
import path from 'path';

import { connect } from 'puppeteer-real-browser';

import extraStealth from 'puppeteer-extra-plugin-stealth';

import wafFetch, { chromeVersion } from '../src/util/waf/fetch';

console.log('need to solve the captcha. this may be a second.');

const { page, browser } = await connect({
    headless: false,
    turnstile: true,
    plugins: [extraStealth()]
});

await page.setUserAgent(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`);
await page.goto('https://usercheck.com/providers');

let x = await new Promise<string>((resolve) => {
    let i = setInterval(async () => {
        const cookies = await browser.cookies();
        const cfClearance = cookies.find(c => c.name === 'cf_clearance');
        const cfOB = cookies.find(c => c.name === '__cf_ob');
        if (cfClearance) {
            clearInterval(i);

            if (cfOB) resolve(`${cfClearance.name}=${cfClearance.value}; ${cfOB.name}=${cfOB.value}`);
            else resolve(`${cfClearance.name}=${cfClearance.value}`);
        }
    }, 100);
});

browser.close();

console.log('captcha solved');

const providers: { name: string, domainCount: number, page: number }[] = [];

let i = 0;

while (!providers.length || providers[providers.length - 1].domainCount >= 5) {
    const req = await wafFetch('https://www.usercheck.com/providers?page=' + (i + 1), {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Cookie': x
        },
        noProxy: true
    });

    const res = req.text().replaceAll('\n', '');

    const matches = Array.from(res.matchAll(/<div class="font-mono text-2xl font-medium text-primary-900">\s*([^<]+?)\s*<\/div>\s*<div class="text-gray-700">\s*([\d,]+) domains\s*<\/div>/g), m => ({ name: m[1].trim(), domainCount: parseInt(m[2].replace(/,/g, '')), page: i + 1 }));

    providers.push(...matches);
    console.log(`scraped page ${i + 1} with ${matches.length} matches (lowest: ${matches[matches.length - 1]?.domainCount || 'N/A'})`);

    i++;

    await new Promise((r) => setTimeout(r, i < THRESHOLD ? i * DELAY : THRESHOLD * DELAY));
}

const domainFile = path.join(import.meta.dirname, '..', 'DOMAINS.md');
const domainsFromFile = fs.readFileSync(domainFile, 'utf-8').split('\n').filter(l => l.startsWith('Y ') || l.startsWith('N ') || l.startsWith('- ')).map(l => l.split(' ')[1]);
const newDomains = providers.map(p => p.name).filter(d => !domainsFromFile.includes(d) && !IGNORE_LIST.includes(d) && d.includes('.')).sort();

console.log(`identified ${providers.length} domains`);
console.log(newDomains.length ? `new domains found: ${newDomains.join(', ')}` : 'no new domains :D');