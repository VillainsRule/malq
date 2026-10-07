import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class aksesemail$my$id implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://aksesemail.my.id/api/domains');
        const res = await req.json() as { domains: { name: string, isActive: boolean }[] };

        return res.domains.filter(d => d.isActive).map(d => d.name);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://aksesemail.my.id/api/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            emails: {
                id: string,
                from: string,
                subject: string,
                received_at: string | number
            }[]
        };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://aksesemail.my.id/api/inbox/${encodeURIComponent(address)}/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { body: string, html: string } };
                e.body = bodyRes.email.body || bodyRes.email.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
