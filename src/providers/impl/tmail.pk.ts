import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tmail$pk implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://www.tmail.pk/api/domains/list');
        const res = await req.json() as { domain_name: string, is_verified: boolean, admin_approval: string }[];

        return res.filter(d => d.is_verified && d.admin_approval === 'approved').map(d => d.domain_name);
    }

    async createInbox(address: string): Promise<void> {
        const password = crypto.randomUUID();

        const createReq = await fish('https://www.tmail.pk/api/guest/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: address, password })
        });

        if (!createReq.ok) throw new Error('tmail.pk: createInbox: ' + await createReq.text());

        const sessionReq = await fish('https://www.tmail.pk/api/mailbox/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: address, password })
        });

        const sessionRes = await sessionReq.json() as { token: string };
        this.$token = sessionRes.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const headers = { Authorization: `Bearer ${this.$token}` };

        const req = await fish(`https://www.tmail.pk/api/emails/list?recipient=${encodeURIComponent(address)}`, { headers });
        const res = await req.json() as {
            emails: {
                id: string,
                sender: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://www.tmail.pk/api/emails/detail?recipient=${encodeURIComponent(address)}&id=${e.id}`, { headers }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { body_text: string, body_html: string } };
                e.body = bodyRes.email.body_text || bodyRes.email.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
