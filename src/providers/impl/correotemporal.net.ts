import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class correotemporal$net implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://api.correotemporal.net/domains', { headers: { Accept: 'application/json' } });
        const res = await req.json() as { 'hydra:member': { domain: string, isActive: boolean, isPrivate: boolean }[] };

        return res['hydra:member'].filter(d => d.isActive && !d.isPrivate).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const password = crypto.randomUUID();

        const createReq = await fish('https://api.correotemporal.net/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, password })
        });

        if (!createReq.ok) throw new Error('correotemporal.net: createInbox: ' + await createReq.text());

        const tokenReq = await fish('https://api.correotemporal.net/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, password })
        });

        const tokenRes = await tokenReq.json() as { token: string };
        this.$token = tokenRes.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://api.correotemporal.net/messages', { headers: { Authorization: `Bearer ${this.$token}`, Accept: 'application/json' } });
        const res = await req.json() as {
            'hydra:member': {
                id: string,
                from: { address: string },
                subject: string,
                createdAt: string
            }[]
        };

        const returnableMail: Mail[] = res['hydra:member'].map((email) => ({
            id: email.id,
            from: email.from.address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.createdAt).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://api.correotemporal.net/messages/${e.id}`, { headers: { Authorization: `Bearer ${this.$token}`, Accept: 'application/json' } }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string[] | string };
                e.body = bodyRes.text || (Array.isArray(bodyRes.html) ? bodyRes.html.join('') : bodyRes.html);
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
