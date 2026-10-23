const IGNORE_LIST: string[] = [];

import fs from 'fs';
import path from 'path';

import { launch } from './cdp/browser';

import wafFetch from '../src/util/waf/fetch';

console.log('need to solve the captcha. this may be a second.');

const { page, close } = await launch();

await page.goto('https://addrly.io/disposable-email-providers');
await page.waitFor((h) => !h.includes('Just a moment') && h.includes('Disposable Email Providers'));

const cookies = await page.cookies().then(c => c.map(c => `${c.name}=${c.value}`).join('; '));
const userAgent = await page.evaluate(`navigator.userAgent`);

await close();

console.log('captcha solved');

const req = await wafFetch('https://addrly.io/disposable-email-providers', {
    headers: {
        accept: 'application/json',
        cookie: cookies,
        'user-agent': userAgent
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