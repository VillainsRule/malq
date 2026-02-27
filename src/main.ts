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
    const providerPath = path.join(providerDir, providerFile);
    const providerModule = await import(providerPath);
    providers.set(providerFile.replace('.ts', ''), providerModule.default);
}

console.log(`[malq] operating off ${providers.size} providers!`);

const app = new Elysia();

const sessions = new Map<string, Provider>();

const indexPath = path.join(import.meta.dirname, 'app', 'index.html');
const indexContent = await Bun.file(indexPath).text();
const servedIndex = indexContent.replace('</ul>', providers.size > 0 ? Array.from(providers.keys()).map((e) => `<li><a href="https://${e.replace(/\$/g, '.')}" target="_blank">${e.replace(/\$/g, '.')}</a></li>`).join('') + '</ul>' : '</ul>');

app.get('/', () => new Response(servedIndex, { headers: { 'Content-Type': 'text/html' } }));
app.get('/robots.txt', () => new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } }));

app.get('/api/v1/mail/*', ({ params, query, request }) => {
    const url = new URL(request.url);
    const newPath = `/api/v1/${params['*']}`;
    const searchParams = new URLSearchParams(query as Record<string, string>);
    return Response.redirect(new URL(`${newPath}?${searchParams.toString()}`, url.origin), 307);
});

app.get('/api/v1/session', async ({ query }) => {
    let provider: Provider;

    if (query.provider && Bun.env.ALLOW_PROVIDER_SPECIFY === '1') {
        const specifiedProvider = providers.get(query.provider);
        if (!specifiedProvider) return { error: 'invalid provider specified' };
        provider = new specifiedProvider();
    } else {
        const randomProvider = Array.from(providers.values())[Math.floor(Math.random() * providers.size)];
        provider = new randomProvider();
    }

    const address = await provider.getAddress();

    const token = crypto.randomUUID();

    sessions.set(token, provider);

    setTimeout(() => {
        provider.destroy();
        sessions.delete(token);
    }, 2 * 60 * 1000);

    return { address, token, provider: provider.constructor.name };
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