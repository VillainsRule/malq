const IGNORE_LIST = [
    'paicha.cloud'
]

import fs from 'node:fs';
import path from 'node:path';

import { parse } from 'node-html-parser';

const req = await fetch('https://deviceandbrowserinfo.com/data/emails/providers');
const res = await req.text();

const document = parse(res);

const providers = document.querySelectorAll('li[style]');
const domains = providers.map((p) => p.children[0].children[0].innerText.trim()).filter((d) => d);

const domainFile = path.join(import.meta.dirname, '..', 'DOMAINS.md');
const domainsFromFile = fs.readFileSync(domainFile, 'utf-8').split('\n').filter(l => l.startsWith('Y ') || l.startsWith('N ') || l.startsWith('- ')).map(l => l.split(' ')[1]);

const newDomains = domains.filter(d => !domainsFromFile.includes(d) && d.includes('.') && !IGNORE_LIST.includes(d)).sort();
console.log(newDomains.length ? `new domains found: ${newDomains}` : 'no new domains :D');