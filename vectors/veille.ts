const IGNORE_LIST: string[] = [
    'ms.emailfake.com',
    'premiumindigital.site'
];

import fs from 'fs';
import path from 'path';

import wafFetch from '../src/util/waf/fetch';

const req = await wafFetch('https://www.veille.io/disposable-email-providers', { noProxy: true });

const res = req.text();

const providerMatches = res.match(/\/disposable-email-providers\/(.*?)[\\|"]/g)!;
const providers = providerMatches.map(e => e.match(/\/disposable-email-providers\/(.*?)[\\|"]/)![1]);

const domainFile = path.join(import.meta.dirname, '..', 'DOMAINS.md');
const domainsFromFile = fs.readFileSync(domainFile, 'utf-8').split('\n').filter(l => l.startsWith('Y ') || l.startsWith('N ') || l.startsWith('- ')).map(l => l.split(' ')[1]);
const newDomains = [...new Set(providers.filter(d => !domainsFromFile.includes(d) && !IGNORE_LIST.includes(d)).sort())];

console.log(`identified ${providers.length} domains`);
console.log(newDomains.length ? `new domains found: ${newDomains.join(', ')}` : 'no new domains :D');