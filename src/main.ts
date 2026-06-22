import fs from 'node:fs';
import path from 'node:path';

import Elysia from 'elysia';

import type Provider from './providers/Provider';

const providerDir = path.join(import.meta.dirname, 'providers', 'impl');
const providerFiles = fs.readdirSync(providerDir).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
const providerSubdirs = fs.readdirSync(providerDir).filter((file) => fs.statSync(path.join(providerDir, file)).isDirectory());

for (const subdir of providerSubdirs) {
    const subdirPath = path.join(providerDir, subdir);
    const subdirFiles = fs.readdirSync(subdirPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of subdirFiles) providerFiles.push(path.join(subdir, file));
}

const providers: Map<string, { new(): Provider }> = new Map();

for (const providerFile of providerFiles) {
    if (providerFile.includes('_')) continue;

    const providerPath = path.join(providerDir, providerFile);
    const providerModule = await import(providerPath);
    providers.set(providerFile.replace('.ts', ''), providerModule.default);
}

console.log(`[malq] operating off ${providers.size} providers!`);

const app = new Elysia();

const sessions = new Map<string, Provider>();

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

app.get('/api/v1/mail/*', ({ params, query, request }) => {
    const url = new URL(request.url);
    const newPath = `/api/v1/${params['*']}`;
    const searchParams = new URLSearchParams(query as Record<string, string>);
    return Response.redirect(new URL(`${newPath}?${searchParams.toString()}`, url.origin).toString(), 307);
});

app.get('/api/v1/session', async ({ query }) => {
    let provider: Provider;

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
        const address = await provider.getAddress();
        const token = crypto.randomUUID();

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

    const mail = await provider.getMail();

    return { address: provider.address, mail };
});

app.listen(4400, () => {
    console.log('[malq] on http://localhost:4400');
    console.log(`[malq] proxy ${process.env.PROXY ? 'enabled ' : 'disabled [CAUTION]'}`);
});