import { resolveMx } from 'node:dns/promises';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailkuh$my$id implements ProviderImpl {
    $sessionId = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailkuh.my.id/api/domains');
        const res = await req.json() as { domains: { domain: string }[] };

        const checked = await Promise.all(res.domains.map(async ({ domain }) => (await resolveMx(domain).catch(() => [])).length ? domain : ''));
        return checked.filter(Boolean);
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        const req = await fish('https://mailkuh.my.id/api/inboxes', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ domain, username })
        });

        if (!req.ok) throw new Error('mailkuh.my.id: createInbox: ' + await req.text());

        const res = await req.json() as { sessionId: string };
        this.$sessionId = res.sessionId;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mailkuh.my.id/api/inboxes/${encodeURIComponent(address)}/messages`, { headers: { 'x-session-id': this.$sessionId } });
        const res = await req.json() as {
            id: string,
            from: string,
            fromEmail: string,
            subject: string,
            body: string,
            html: string,
            receivedAt: string | number
        }[];

        return res.map((email) => ({
            id: email.id,
            from: email.fromEmail || email.from,
            to: address,
            subject: email.subject,
            body: email.html || email.body,
            date: new Date(email.receivedAt).getTime()
        }));
    }
}
