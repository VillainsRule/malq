import fs from 'node:fs';
import path from 'node:path';

import { Elysia, t } from 'elysia';

const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes

const demoPath = path.join(import.meta.dirname, 'app', 'demo.html');
const demoContent = fs.readFileSync(demoPath, 'utf-8');
const templatedDemo = demoContent
    .replace('{DEMO_POW_DIFFICULTY}', Bun.env.DEMO_POW_DIFFICULTY || '5')
    .replace('{DEMO_SESSION_USES}', Bun.env.DEMO_SESSION_USES || '10')

const challenges = new Map<string, { ip: bigint; target: string; expires: number }>();
const tokens = new Map<string, { ip: bigint; remaining: number; expires: number }>();

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of challenges) if (v.expires < now) challenges.delete(k);
    for (const [k, v] of tokens) if (v.expires < now) tokens.delete(k);
}, 60 * 1000);

const app = new Elysia()
    .derive(({ request, server }) => ({ clientIP: Bun.hash.xxHash3(server!.requestIP(request)?.address || '') }))

    .get('/demo', () => Bun.env.DEMO_ENABLED ?
        new Response(templatedDemo, { headers: { 'content-type': 'text/html' } }) :
        Response.redirect('/', { status: 302 }))

    .get('/api/v1/demo/challenge', ({ clientIP }) => {
        const difficulty = parseInt(Bun.env.DEMO_POW_DIFFICULTY || '6', 10);
        const challenge = crypto.randomUUID();
        const target = '0'.repeat(difficulty);

        challenges.set(challenge, {
            ip: clientIP,
            target,
            expires: Date.now() + 5 * 60 * 1000
        });

        return { challenge, target };
    })

    .post('/api/v1/demo/verify', async ({ clientIP, body }) => {
        const { challenge, nonce } = body;
        const entry = challenges.get(challenge);

        if (!entry) return new Response('Invalid or expired challenge', { status: 400 });
        if (entry.ip !== clientIP) return new Response('IP mismatch', { status: 403 });

        if (entry.expires < Date.now()) {
            challenges.delete(challenge);
            return new Response('Challenge expired', { status: 400 });
        }

        const input = `${challenge}:${nonce}`;
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (!hex.startsWith(entry.target)) return new Response('Invalid proof of work', { status: 400 });

        challenges.delete(challenge);

        const sessionsPerSolve = parseInt(Bun.env.DEMO_SESSION_USES || '10', 10);
        const token = crypto.randomUUID();

        tokens.set(token, {
            ip: clientIP,
            remaining: sessionsPerSolve,
            expires: Date.now() + SESSION_EXPIRY
        });

        return { token, remaining: sessionsPerSolve };
    },
        { body: t.Object({ challenge: t.String(), nonce: t.String() }) }
    );

export { app as demoApp, tokens as demoTokens };