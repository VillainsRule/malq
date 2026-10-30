import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class driftz$net implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://api.driftz.net/domains');
        const res = await req.json() as { result: { public: string[] } };
        return res.result.public;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://api.driftz.net/emails/${address}?limit=100`);
        const res = await req.json() as {
            result: {
                items: {
                    id: string,
                    fromAddress: string,
                    toAddress: string,
                    subject: string,
                    receivedAt: number
                }[]
            }
        }

        const returnableMail: Mail[] = res.result.items.map((email) => ({
            id: email.id,
            from: email.fromAddress,
            to: email.toAddress,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.receivedAt * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://api.driftz.net/inbox/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { result: { textContent: string, htmlContent: string } };
                e.body = bodyRes.result.textContent || bodyRes.result.htmlContent;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}