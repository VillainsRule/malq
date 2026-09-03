import fs from 'node:fs';
import path from 'node:path';

import getPSL from '@/util/PSL';

import type { ProviderImpl } from '@/providers/Provider';

const providerDir = path.join(import.meta.dirname, '..', 'src', 'providers', 'impl');
const providerFiles = fs.readdirSync(providerDir).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
const providerSubdirs = fs.readdirSync(providerDir).filter((file) => fs.statSync(path.join(providerDir, file)).isDirectory());

for (const subdir of providerSubdirs) {
    const subdirPath = path.join(providerDir, subdir);
    const subdirFiles = fs.readdirSync(subdirPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of subdirFiles) providerFiles.push(path.join(subdir, file));
}

const providers: Map<string, { new(): ProviderImpl }> = new Map();

providerFiles.sort();

for (const providerFile of providerFiles) {
    if (providerFile.includes('_')) continue;

    const providerPath = path.join(providerDir, providerFile);
    const providerModule = await import(providerPath);
    providers.set(providerFile.replace('.ts', ''), providerModule.default);
}

const values = Array.from(providers.values());

const domains: Record<string, string> = {};
const pending: string[] = [];

setInterval(() => console.log('pending:', pending.join(',')), 5000).unref();

const blacklist = ['name.ng'];

await Promise.all(values.map(async (ProviderClass) => {
    const provider = new ProviderClass();
    pending.push(provider.constructor.name);

    try {
        const domainList = await provider.getDomains();
        const seenDomains: string[] = [];
        domainList.forEach((d) => {
            const psl = getPSL(d);
            if (seenDomains.includes(`${psl.prefix}|${psl.suffix.suffix}`) || blacklist.includes(psl.suffix.suffix)) return;
            seenDomains.push(`${psl.prefix}|${psl.suffix.suffix}`);

            if (domains[d]) console.warn(`"${d}" in both ${provider.constructor.name}, ${domains[d]}`);
            domains[d] = provider.constructor.name;
        });
        pending.splice(pending.indexOf(provider.constructor.name), 1);
    } catch (e) {
        console.error(`provider ${provider.constructor.name} errored:`);
        console.error(e);
        pending.splice(pending.indexOf(provider.constructor.name), 1);
    }
}));

const compareSegments = (a: string[], b: string[]): number => {
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
        const cmp = (a[i] ?? '').localeCompare(b[i] ?? '')
        if (cmp !== 0) return cmp
    }
    return 0
}

const p1 = Object.entries(domains).map(d => ([d[0].split('.').reverse(), d[1]]));
const p2 = p1.sort((a, b) => compareSegments(a[0] as any, b[0] as any));
const p3 = p2.map(d => [(d[0] as any).join('.'), d[1]])

const pad = (s: string, len: number) => s + ' '.repeat(Math.max(0, len - s.length));

const domainWidth = Math.max(...p3.map(e => e[0].length), 'domain'.length);
const providerWidth = Math.max(...p3.map(e => e[1].length), 'provider'.length);

const lines = [
    `${pad('domain', domainWidth)} ${pad('provider', providerWidth)}`,
    ...p3.map(([domain, provider]) => `${pad(domain, domainWidth)} ${pad(provider, providerWidth)}`)
];

fs.writeFileSync('./domains.txt', lines.join('\n'));