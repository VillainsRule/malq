const IGNORE_LIST = [
    '215.im' // vip.215.im
];

import fs from 'fs';
import path from 'path';

import { parse } from 'node-html-parser';

const providers: string[] = [];

let i = 0;

while (true) {
    const req = await fetch('https://check-mail.org/disposable-providers?page=' + (i + 1), {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
        }
    });

    const res = await req.text();
    const dom = parse(res);

    const hits = dom.querySelectorAll('a[href^="/disposable-provider/"]');
    const matches = hits.map(e => e.innerText.trim()).filter(e => e && e.includes('.'));

    providers.push(...matches);

    console.log(`scraped page ${i + 1} with ${matches.length} matches`);

    i++;

    if (!dom.querySelector('a[rel="next"]')) break;
}

const domainFile = path.join(import.meta.dirname, '..', 'DOMAINS.md');
const domainsFromFile = fs.readFileSync(domainFile, 'utf-8').split('\n').filter(l => l.startsWith('Y ') || l.startsWith('N ') || l.startsWith('- ')).map(l => l.split(' ')[1]);
const newDomains = providers.filter(d => !domainsFromFile.includes(d) && !IGNORE_LIST.includes(d) && d.includes('.')).sort();

console.log(`identified ${providers.length} domains`);
console.log(newDomains.length ? `new domains found: ${newDomains.join(', ')}` : 'no new domains :D');