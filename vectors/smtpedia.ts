const IGNORE_LIST: string[] = [];

import fs from 'fs';
import path from 'path';

import { parse } from 'node-html-parser';

import wafFetch from '../src/util/waf/fetch';

const req = await wafFetch('https://smtpedia.com/email-verification/disposable-email-providers/', { noProxy: true });
const res = req.text();
const dom = parse(res);

const rows = dom.querySelectorAll('tr[data-search]');

const providers = rows
    .filter(e => Number(e.getAttribute('data-domains')) > 5)
    .map(e => e.getAttribute('data-search')?.split(' ')[0] || '')
    .filter(e => e && e.includes('.'));

const domainFile = path.join(import.meta.dirname, '..', 'DOMAINS.md');
const domainsFromFile = fs.readFileSync(domainFile, 'utf-8').split('\n').filter(l => l.startsWith('Y ') || l.startsWith('N ') || l.startsWith('- ')).map(l => l.split(' ')[1]);
const newDomains = providers.filter(d => !domainsFromFile.includes(d) && !IGNORE_LIST.includes(d)).sort();

console.log(`identified ${providers.length} domains`);
console.log(newDomains.length ? `new domains found: ${newDomains.join(', ')}` : 'no new domains :D');