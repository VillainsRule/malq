import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class neighbours$sh implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://neighbours.sh');
        const res = await req.text();

        const domains = res.match(/const DOMAINS = \['(.*?)'\]/)![1];
        return domains.split(`', '`).filter(e => !e.startsWith('*'));
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://neighbours.sh/api/v1/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            data: {
                uid: number,
                from: any,
                date: string,
                subject: string
            }[]
        }

        const returnableMail: Mail[] = res.data.map((email) => ({
            id: email.uid.toString(),
            from: email.from[0].address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.uid] || '',
            date: new Date(email.date).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://neighbours.sh/api/v1/inbox/${encodeURIComponent(address)}/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { text: string, html: string } };
                e.body = bodyRes.data.text || bodyRes.data.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}