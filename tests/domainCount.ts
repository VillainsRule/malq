import fs from 'node:fs';
import path from 'node:path';

const domains = fs.readFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), 'utf-8').split('\n');

await Promise.all(domains.map(async (line, i) => {
    if (line.startsWith('N ') && line.includes(' domains]')) {
        const domain = line.split(' ')[1];
        const oldNumDomains = line.match(/\[(\d+) domains?\]/)?.[1];
        if (!oldNumDomains) return console.log(`domain ${domain} has no number of domains specified`);

        const path = {
            laravel: '/',
            laravel2: '/change',
            lwMessage: '/',
            lwUpdate: '/',
            surl: '/'
        }

        const provider = line.match(/\((.*?)\)/)?.[1] as keyof typeof path;
        if (!provider) return;
        if (!path[provider]) return console.log(`domain ${domain} has an unknown provider: ${provider}`);

        const r = await fetch('https://' + domain + path[provider], { signal: AbortSignal.timeout(5000) });
        const res = await r.text();
        let numDomains = 0;

        if (provider === 'laravel' || provider === 'laravel2') {
            const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
            numDomains = new Set(matchedDomains.map(e => e.match(/<option value="(.*?)"/)?.[1])).size;
        } else if (provider === 'lwMessage' || provider === 'lwUpdate') {
            const domainMatches = res.match(/\$wire\.setDomain\('(.*?)'/g) || [];
            numDomains = new Set(domainMatches.map(e => e.match(/\$wire\.setDomain\('(.*?)'/)?.[1])).size;
        } else if (provider === 'surl') {
            const domains = res.match(/change_dropdown_list\(this\.innerHTML\)" id="(.*?)"/g) || [];
            numDomains = new Set(domains.map(d => d.match(/change_dropdown_list\(this\.innerHTML\)" id="(.*?)"/)?.[1])).size;
        }

        if (numDomains !== Number(oldNumDomains)) {
            domains[i] = line.replace(/\[(\d+) domains?\]/, `[${numDomains} domains]`);
            console.log(`domain ${domain} has a different number of domains: expected ${oldNumDomains}, got ${numDomains}`);
        }
    };
}));

fs.writeFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), domains.join('\n'), 'utf-8');