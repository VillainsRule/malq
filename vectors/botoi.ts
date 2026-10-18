const IGNORE_LIST: string[] = [];

import fs from 'fs';
import path from 'path';

const req = await fetch('https://api.botoi.com/v1/disposable-email/list');

const res = await req.json() as { data: { domains: string[] } };
const list = res.data.domains.filter(e => e);

const domainFile = path.join(import.meta.dirname, '..', 'DOMAINS.md');
const domainsFromFile = fs.readFileSync(domainFile, 'utf-8').split('\n').filter(l => l.startsWith('Y ') || l.startsWith('N ') || l.startsWith('- ')).map(l => l.split(' ')[1]);

const newDomains = list.filter(d => !domainsFromFile.includes(d) && !IGNORE_LIST.includes(d)).sort();
console.log(`identified ${list.length} domains`);
console.log(newDomains.length ? `new domains found: ${newDomains.join(', ')}` : 'no new domains :D');