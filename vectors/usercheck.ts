const IGNORE_LIST: string[] = [];

const THRESHOLD = 10;
const DELAY = 800;

import fs from 'fs';
import path from 'path';

import { launch } from './cdp/browser';

console.log('need to solve the captcha. this may be a second.');

const { page, close } = await launch();

await page.goto('https://www.usercheck.com/providers');
await page.waitFor((h) => !h.includes('Just a moment') && h.includes(' domains'));

const cookies = await page.cookies().then(c => c.map(c => `${c.name}=${c.value}`).join('; '));
const userAgent = await page.evaluate(`navigator.userAgent`);

await close();

console.log('captcha solved');

const providers: { name: string, domainCount: number, page: number }[] = [];

let i = 0;

while (!providers.length || providers[providers.length - 1].domainCount >= 5) {
    const html = await Bun.$`curl -s --url 'https://www.usercheck.com/providers?page=${i + 1}' -b '${cookies}' -H 'user-agent: ${userAgent}'`.text();

    const res = (html ?? '').replaceAll('\n', '');

    if (!res || res.includes('Just a moment')) throw new Error('cf WAF failing...GG');

    const matches = Array.from(res.matchAll(/<div class="font-mono text-2xl font-medium text-primary-900">\s*([^<]+?)\s*<\/div>\s*<div class="text-gray-700">\s*([\d,]+) domains\s*<\/div>/g), m => ({ name: m[1].trim(), domainCount: parseInt(m[2].replace(/,/g, '')), page: i + 1 }));

    if (matches.length < 1) console.log(res);

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