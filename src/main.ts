import fs from 'node:fs';
import path from 'node:path';

import Elysia from 'elysia';

import type Provider from './providers/Provider';

const providerDir = path.join(import.meta.dirname, 'providers', 'impl');
const providerFiles = fs.readdirSync(providerDir).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
const providers: Map<string, { new (): Provider }> = new Map();

for (const providerFile of providerFiles) {
    const providerPath = path.join(providerDir, providerFile);
    const providerModule = await import(providerPath);
    providers.set(providerFile.replace('.ts', ''), providerModule.default);
}

const app = new Elysia();

const sessions = new Map<string, Provider>();

const indexPath = path.join(import.meta.dirname, 'app', 'index.html');
const indexContent = await Bun.file(indexPath).text();
const servedIndex = indexContent.replace('</ul>', providers.size > 0 ? Array.from(providers.keys()).map((e) => `<li><a href="https://${e.replace(/\$/g, '.')}" target="_blank">${e.replace(/\$/g, '.')}</a></li>`).join('') + '</ul>' : '</ul>');

app.get('/', () => new Response(servedIndex, { headers: { 'Content-Type': 'text/html' } }));
app.get('/robots.txt', () => new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } }));

app.get('/api/v1/mail/session', async () => {
    const randomProvider = Array.from(providers.values())[Math.floor(Math.random() * providers.size)];
    const provider = new randomProvider();
    const address = await provider.getAddress();

    const token = crypto.randomUUID();

    sessions.set(token, provider);

    setTimeout(() => {
        provider.destroy();
        sessions.delete(token);
    }, 2 * 60 * 1000);

    return { address, token, provider: provider.constructor.name };
});

app.get('/api/v1/mail/inbox/:address', async ({ params }) => {
    const token = params.address;
    const provider = sessions.get(token);

    if (!provider) return { error: 'Invalid session token' };

    const mail = await provider.getMail();

    return { address: provider.address, mail };
});

app.listen(4400, () => {
    console.log('malq be ballin: http://localhost:4400');
    console.log(`malq is ${!process.env.PROXY ? 'not ' : ''}using a proxy`);
});