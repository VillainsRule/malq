import path from 'node:path';

const PATH = path.resolve(import.meta.dir, '../DOMAINS.md');
const TRACKER = '**DOMAIN TRACKER:**';
const TAGS = ['laravel', 'lwMessage', 'lwUpdate', 'mail.tm'];

const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
};

const json = (data: unknown, status = 200) => Response.json(data, { status, headers });

const read = async () => (await Bun.file(PATH).text()).split('\n');

const getReasons = async () => {
    const groups: { title: string, reasons: { code: string, desc: string }[] }[] = [];
    for (const line of await read()) {
        if (line === TRACKER) break;
        const head = line.match(/^\*\*(.+?) CODES:\*\*$/);
        if (head) groups.push({ title: head[1], reasons: [] });
        const item = line.match(/^- (?:\[C\] )?([^:]+): (.*)$/);
        if (item && groups.length) groups.at(-1)!.reasons.push({ code: item[1], desc: item[2] });
    }
    return { groups, tags: TAGS };
};

const lookup = async (domain: string) => {
    return (await read()).filter(l => l.toLowerCase().split(/\s+/).includes(domain));
};

const record = async (body: { domain: string, verdict: 'Y' | 'N', reason?: string, count?: number, tags?: string[], note?: string }) => {
    const domain = body.domain.trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(domain)) throw new Error('bad domain');

    const lines = await read();
    const tracker = lines.indexOf(TRACKER);
    if (tracker < 0) throw new Error('tracker header missing');

    if (body.verdict === 'Y') {
        const todo = lines.indexOf('to do:');
        if (todo < 0) throw new Error('"to do:" header missing');
        lines.splice(todo + 1, 0, `- ${domain}`);
    } else {
        if (!body.reason) throw new Error('reason required');
        const code = body.reason === 'domains' ? `${body.count || 1} domain${body.count === 1 || !body.count ? '' : 's'}` : body.reason;
        const tags = (body.tags || []).map(t => ` (${t})`).join('');
        const note = body.note?.trim() ? ` (${body.note.trim()})` : '';
        const line = `N ${domain} [${code}]${tags}${note}`;

        const first = domain[0];
        const ns = lines.map((l, i) => ({ l, i })).filter(({ l, i }) => i > tracker && l.startsWith('N '));
        const same = ns.filter(({ l }) => l[2].toLowerCase() === first);
        if (same.length) lines.splice(same.at(-1)!.i + 1, 0, line);
        else {
            const before = ns.filter(({ l }) => l[2].toLowerCase() < first);
            if (before.length) lines.splice(before.at(-1)!.i + 1, 0, '', line);
            else lines.splice(ns[0].i, 0, line, '');
        }
    }

    await Bun.write(PATH, lines.join('\n'));
};

Bun.serve({
    port: 4401,
    hostname: '127.0.0.1',
    fetch: async (req) => {
        const url = new URL(req.url);
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
        try {
            if (url.pathname === '/reasons') return json(await getReasons());
            if (url.pathname === '/lookup') return json(await lookup(url.searchParams.get('domain')?.toLowerCase() || ''));
            if (url.pathname === '/record' && req.method === 'POST') {
                await record(await req.json() as Parameters<typeof record>[0]);
                return json({ ok: true });
            }
            return json({ error: 'not found' }, 404);
        } catch (e) {
            return json({ error: (e as Error).message }, 400);
        }
    }
});

console.log('webext server up on http://127.0.0.1:4401');