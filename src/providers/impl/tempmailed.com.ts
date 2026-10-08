import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmailed$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmailed.com/api/domains');
        const res = await req.json() as { domain: string, isActive: boolean }[];

        return res.filter(d => d.isActive).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const password = crypto.randomUUID();

        const createReq = await fish('https://tempmailed.com/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, password })
        });

        if (!createReq.ok) throw new Error('tempmailed.com: createInbox: ' + await createReq.text());

        const tokenReq = await fish('https://tempmailed.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, password })
        });

        const tokenRes = await tokenReq.json() as { token: string };
        this.$token = tokenRes.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://tempmailed.com/api/messages', { headers: { Authorization: `Bearer ${this.$token}` } });
        const res = await req.json() as {
            id: string,
            from: { address: string },
            subject: string,
            createdAt: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.from.address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.createdAt).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://tempmailed.com/api/messages/${e.id}`, { headers: { Authorization: `Bearer ${this.$token}` } }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string[] | string };
                e.body = bodyRes.text || (Array.isArray(bodyRes.html) ? bodyRes.html.join('') : bodyRes.html);
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
