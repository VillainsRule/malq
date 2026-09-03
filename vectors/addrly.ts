const IGNORE_LIST: string[] = [];

import fs from 'fs';
import path from 'path';

import { connect } from 'puppeteer-real-browser';

import wafFetch, { chromeVersion } from '../src/util/waf/fetch';

console.log('need to solve the captcha. this may be a second.');

const { page, browser } = await connect({
    headless: false,
    turnstile: true,
});

await page.setUserAgent(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`);
await page.goto('https://addrly.io/disposable-email-providers');

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

const req = await wafFetch('https://addrly.io/disposable-email-providers', {
    headers: {
        accept: 'application/json',
        cookie: x
    },
    noProxy: true
});

const res = await req.json() as { providers: { name: string, domain_count: number }[] };
const addrlyIndex = res.providers.filter(p => p.domain_count >= 5 && p.name.includes('.') && !p.name.includes(':')).map(e => e.name.replace('www.', ''));

const domainFile = path.join(import.meta.dirname, '..', 'DOMAINS.md');
const domainsFromFile = fs.readFileSync(domainFile, 'utf-8').split('\n').filter(l => l.startsWith('Y ') || l.startsWith('N ') || l.startsWith('- ')).map(l => l.split(' ')[1]);

const newDomains = addrlyIndex.filter(d => !domainsFromFile.includes(d) && !IGNORE_LIST.includes(d)).sort();
console.log(`identified ${addrlyIndex.length} domains`);
console.log(newDomains.length ? `new domains found: ${newDomains.join(', ')}` : 'no new domains :D');