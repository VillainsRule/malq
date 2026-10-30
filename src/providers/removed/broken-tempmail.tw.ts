import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmail$tw implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmail.tw/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://tempmail.tw/api/inbox/${address}`);
        const res = await req.json() as {
            messages: {
                id: string,
                date: string,
                from: string,
                subject: string
            }[]
        };

        return Promise.all(res.messages.map(async (email) => {
            if (!this.bodies[email.id]) {
                const bodyReq = await fish(`https://tempmail.tw/api/message/${email.id}?address=${address}`);
                const bodyRes = await bodyReq.json() as { textBody: string, htmlBody: string };
                this.bodies[email.id] = bodyRes.htmlBody || bodyRes.textBody;
            }

            return {
                id: email.id,
                from: email.from,
                to: address,
                subject: email.subject,
                body: this.bodies[email.id],
                date: new Date(email.date).getTime()
            };
        }));
    }
}
