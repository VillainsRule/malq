import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class kvlarapps$cloud implements ProviderImpl {
    bodies: Record<string, string> = {};

    $jwt = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://kvlarapps.cloud/open_api/settings');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        const [name, domain] = address.split('@');

        const req = await fish('https://kvlarapps.cloud/api/address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, domain })
        });

        const res = await req.json() as { jwt?: string, error?: string };
        if (!res.jwt) throw new Error('kvlarapps.cloud: createInbox: ' + JSON.stringify(res));

        this.$jwt = res.jwt;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://kvlarapps.cloud/api/mails?limit=20&offset=0', { headers: { Authorization: `Bearer ${this.$jwt}` } });
        const res = await req.json() as {
            mails: {
                id: number,
                from: string,
                subject: string,
                createdAt: string
            }[]
        };

        const returnableMail: Mail[] = res.mails.map((email) => ({
            id: String(email.id),
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.createdAt).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://kvlarapps.cloud/api/mail/${e.id}`, { headers: { Authorization: `Bearer ${this.$jwt}` } }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as any;
                e.body = bodyRes.text || bodyRes.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
