import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class zeroinbox$biz$id implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://www.zeroinbox.biz.id/api/v1/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://www.zeroinbox.biz.id/api/v1/mailbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            messages: {
                id: string,
                from: { address: string },
                subject: string,
                timestamp: number
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from.address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.timestamp
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://www.zeroinbox.biz.id/api/v1/mailbox/${encodeURIComponent(address)}/messages/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { message: { text: string, html: string } };
                e.body = bodyRes.message.text || bodyRes.message.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
