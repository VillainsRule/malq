import wafFetch from '@/util/waf/fetch';

import type { Mail, ProviderImpl } from '../Provider';

export default class inboxburn$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    token: string;

    async getDomains(): Promise<string[]> {
        const req = await wafFetch('https://api.inboxburn.com/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        const [prefix, domain] = address.split('@');

        const req = await wafFetch('https://api.inboxburn.com/api/generate/custom', {
            method: 'POST',
            body: JSON.stringify({ prefix, domain, expiry: 86400000 }),
            headers: { 'content-type': 'application/json' }
        });

        const res = await req.json() as { token: string };

        this.token = res.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await wafFetch(`https://api.inboxburn.com/api/inbox/${encodeURIComponent(address)}`, {
            headers: { 'x-inbox-token': this.token }
        });

        const res = await req.json() as {
            emails: {
                id: string,
                from_address: string,
                subject: string
                received_at: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await wafFetch(`https://api.inboxburn.com/api/email/${e.id}?address=${encodeURIComponent(address)}`, {
                    headers: { 'x-inbox-token': this.token }
                });
                const bodyRes = await bodyReq.json() as { body_text: string, body_html: string };

                e.body = bodyRes.body_text || bodyRes.body_html;
                this.bodies[e.id] = e.body;
            }

            return e;
        }));

        return finalMail;
    }
}