import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class reusable$email implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        return ['reusable.email'];
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://api.reusable.email/v1/inbox', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'origin': 'https://reusable.email' },
            body: JSON.stringify({ address, password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) })
        });

        const res = await req.json() as { token?: string };
        if (!res.token) throw new Error('reusable.email: createInbox: ' + JSON.stringify(res));

        this.$token = res.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const headers = { authorization: `Inbox ${this.$token}` };

        const req = await fish(`https://api.reusable.email/v1/inbox/${address}?limit=20`, { headers });
        const res = await req.json() as {
            emails: {
                id: number,
                from: { address: string },
                subject: string,
                date: string
            }[]
        };

        return Promise.all(res.emails.map(async (email) => {
            if (!this.bodies[email.id]) {
                const bodyReq = await fish(`https://api.reusable.email/v1/inbox/${address}/emails/${email.id}`, { headers });
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                this.bodies[email.id] = bodyRes.html || bodyRes.text;
            }

            return {
                id: String(email.id),
                from: email.from.address,
                to: address,
                subject: email.subject,
                body: this.bodies[email.id],
                date: new Date(email.date).getTime()
            };
        }));
    }
}
