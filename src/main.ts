console.log('[malq] init');

import fs from 'node:fs';
import path from 'node:path';

import Elysia from 'elysia';

import Domains from './util/Domains';

import type { ProviderImpl } from './providers/Provider';

const providerDir = path.join(import.meta.dirname, 'providers', 'impl');
const providerFiles = fs.readdirSync(providerDir).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
const providerSubdirs = fs.readdirSync(providerDir).filter((file) => fs.statSync(path.join(providerDir, file)).isDirectory());

for (const subdir of providerSubdirs) {
    const subdirPath = path.join(providerDir, subdir);
    const subdirFiles = fs.readdirSync(subdirPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of subdirFiles) providerFiles.push(path.join(subdir, file));
}

const providers: Map<string, { new(): ProviderImpl }> = new Map();

for (const providerFile of providerFiles) {
    if (providerFile.includes('_')) continue;

    const providerPath = path.join(providerDir, providerFile);
    const providerModule = await import(providerPath);
    providers.set(providerFile.replace('.ts', ''), providerModule.default);
}

console.log(`[malq] identified ${providers.size} providers`);

let completedProviders: string[] = [];
let progressInterval = setInterval(() => {
    console.log([
        '[malq] fetching domains...',
        `(${completedProviders.length}/${providers.size})`,
        ((providers.size - completedProviders.length) <= 3) && `- pend. ${providers.keys().filter(e => !completedProviders.includes(e)).toArray().join(', ')}`
    ].filter(e => e).join(' '));
}, 1067);

await Promise.all(Array.from(providers).map(async ([name, Provider]) => {
    try {
        const p = new Provider();
        const d = await p.getDomains();
        Domains.set(p.constructor.name, d);
        completedProviders.push(name);
    } catch (e) {
        console.error('[malq] provider encountered an error', name, e);
    }
}));

clearInterval(progressInterval);

const lastNameReq = await fetch('https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Usernames/Names/familynames-usa-top1000.txt');
const lastNameRes = await lastNameReq.text();
const lastNameList = lastNameRes.toLowerCase().split('\n').map(n => n.trim()).filter(n => n.length > 0);

const firstNameReq = await fetch('https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Usernames/Names/malenames-usa-top1000.txt');
const firstNameRes = await firstNameReq.text();
const firstNameList = firstNameRes.toLowerCase().split('\n').map(n => n.trim()).filter(n => n.length > 0);

const getRandomName = () => {
    const firstName = firstNameList[Math.floor(Math.random() * firstNameList.length)];
    const lastName = lastNameList[Math.floor(Math.random() * lastNameList.length)];
    return firstName + Math.random().toString(36).slice(2, 5) + lastName;
};

console.log('[malq] name dictionary init');

const app = new Elysia();

const sessions = new Map<string, ProviderImpl>();

const indexPath = path.join(import.meta.dirname, 'app', 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf-8');
const servedIndex = indexContent.replace('{NUM_PROVIDERS}', providers.size.toString());

app.get('/', () => new Response(servedIndex.replace('{DATE}', Date.now().toString()), { headers: { 'Content-Type': 'text/html' } }));
app.get('/robots.txt', () => new Response(fs.createReadStream(path.join(import.meta.dirname, 'app', 'robots.txt')), { headers: { 'Content-Type': 'text/plain' } }));
app.get('/manifest.json', () => new Response(fs.createReadStream(path.join(import.meta.dirname, 'app', 'manifest.json')), { headers: { 'Content-Type': 'application/json' } }));
app.get('/sitemap.xml', () => new Response(fs.createReadStream(path.join(import.meta.dirname, 'app', 'sitemap.xml')), { headers: { 'Content-Type': 'application/xml' } }));
app.get('/favicon.ico', () => new Response(fs.createReadStream(path.join(import.meta.dirname, 'app', 'icons', '32.png')), { headers: { 'Content-Type': 'image/png' } }));

const iconPath = path.join(import.meta.dirname, 'app', 'icons');

fs.readdirSync(iconPath).forEach((iconFile) => {
    if (iconFile.endsWith('.png'))
        app.get(`/icons/${iconFile}`, () => new Response(fs.createReadStream(path.join(iconPath, iconFile)), { headers: { 'Content-Type': 'image/png' } }));
});

app.get('/api/v1/session', async ({ query }) => {
    let provider: ProviderImpl;

    if (query.provider && process.env.ALLOW_PROVIDER_SPECIFY === '1') {
        const specifiedProvider = providers.get(query.provider);
        if (!specifiedProvider) return { error: 'invalid provider specified' };
        provider = new specifiedProvider();
    } else {
        const randomProvider = Array.from(providers.values())[Math.floor(Math.random() * providers.size)];
        provider = new randomProvider();
    }

    const providerName = provider.constructor.name.replaceAll('$', '.');

    try {
        const randomDomain = Domains.getRandom(provider.constructor.name);
        const address = `${getRandomName()}@${randomDomain}`;
        const token = crypto.randomUUID();

        await provider.createInbox(address);

        sessions.set(token, provider);

        setTimeout(() => sessions.delete(token), 2 * 60 * 1000);

        return { address, token, provider: providerName };
    } catch (e) {
        console.error(e);
        return { error: 'failed to get address from provider', provider: providerName };
    }
});

app.get('/api/v1/inbox/:address', async ({ params }) => {
    const token = params.address;
    const provider = sessions.get(token);

    if (!provider) return { error: 'invalid session token' };

    const mail = await provider.getMail(params.address);

    return { address: params.address, mail };
});

app.listen(4400, () => {
    console.log('[malq] on http://localhost:4400');
    console.log(`[malq] proxy ${process.env.PROXY ? 'enabled ' : 'disabled [CAUTION]'}`);
});