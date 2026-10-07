import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class saga$my$id implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('http://saga.my.id/api/domains');
        const res = await req.json() as { data: string[] };

        return res.data;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`http://saga.my.id/api/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            data: {
                id: string,
                from: string,
                subject: string,
                date: string
            }[]
        };

        const returnableMail: Mail[] = res.data.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.date.replace(' ', 'T') + 'Z').getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`http://saga.my.id/api/email/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { text: string, html: string } };
                e.body = bodyRes.data.text || bodyRes.data.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
