import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class grabmail$io implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://grabmail.io/api/v1/picker');
        const res = await req.json() as { free: string[] };

        return res.free;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://grabmail.io/api/v1/mailbox?address=${encodeURIComponent(address)}&limit=500`);
        const res = await req.json() as {
            messages: {
                id: string,
                from: string,
                subject: string,
                date: string
            }[]
        }

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.date).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://grabmail.io/api/v1/message/${e.id}?mailbox=${encodeURIComponent(address)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                e.body = bodyRes.text || bodyRes.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}