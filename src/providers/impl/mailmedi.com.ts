import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailmedi$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://api.mailmedi.com/api/v1/domains');
        const res = await req.json() as { domains: { domain: string, status: string, visibility: string, mx_verified: boolean }[] };

        return res.domains.filter(d => d.status === 'active' && d.visibility === 'listed' && d.mx_verified).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        const req = await fish('https://api.mailmedi.com/api/v1/mailboxes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, username })
        });

        if (!req.ok) throw new Error('mailmedi.com: createInbox: ' + await req.text());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://api.mailmedi.com/api/v1/mailboxes/${encodeURIComponent(address)}/messages`);
        const res = await req.json() as {
            messages: {
                id: string,
                from_address: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://api.mailmedi.com/api/v1/mailboxes/${encodeURIComponent(address)}/messages/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string, body_html: string };
                e.body = bodyRes.body_text || bodyRes.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
