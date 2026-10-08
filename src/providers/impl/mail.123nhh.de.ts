import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mail$123nhh$de implements ProviderImpl {
    bodies: Record<string, string> = {};

    $key = '';
    $mailboxId = '';

    async register(): Promise<string> {
        const req = await fish('https://mail.123nhh.de/public/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'u' + crypto.randomUUID().replaceAll('-', '').slice(0, 16) })
        });

        const res = await req.json() as { api_key?: string, error?: string };
        if (!res.api_key) throw new Error('mail.123nhh.de: register: ' + JSON.stringify(res));

        return res.api_key;
    }

    async getDomains(): Promise<string[]> {
        const key = await this.register();

        const req = await fish('https://mail.123nhh.de/api/domains', { headers: { Authorization: `Bearer ${key}` } });
        const res = await req.json() as { domains: { domain: string, status: string, supports_single: boolean }[] };

        return res.domains.filter(d => d.status === 'active' && d.supports_single).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const [localPart, domain] = address.split('@');

        this.$key = await this.register();

        const req = await fish('https://mail.123nhh.de/api/mailboxes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.$key}` },
            body: JSON.stringify({ mode: 'single', address: localPart, domain })
        });

        const res = await req.json() as { mailbox?: { id: string }, error?: string };
        if (!res.mailbox) throw new Error('mail.123nhh.de: createInbox: ' + JSON.stringify(res));

        this.$mailboxId = res.mailbox.id;
    }

    async getMail(address: string): Promise<Mail[]> {
        const headers = { Authorization: `Bearer ${this.$key}` };

        const req = await fish(`https://mail.123nhh.de/api/mailboxes/${this.$mailboxId}/emails`, { headers });
        const res = await req.json() as {
            data: {
                id: string,
                sender: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.data.map((email) => ({
            id: email.id,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://mail.123nhh.de/api/mailboxes/${this.$mailboxId}/emails/${e.id}`, { headers }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { body_text: string, body_html: string } };
                e.body = bodyRes.email.body_text || bodyRes.email.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
