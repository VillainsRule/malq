// inconsistent dates

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class duckzmail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://duckzmail.com/api/verified-domains');
        const res = await req.json() as { domains: string[] };

        return res.domains.filter(d => !d.includes('xn--'));
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://duckzmail.com/api/emails?recipient=${encodeURIComponent(address)}`);
        const res = await req.json() as {
            emails: {
                id: string,
                sender: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://duckzmail.com/api/emails/${e.id}/body`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { html?: string, text?: string };
                e.body = bodyRes.html || bodyRes.text || '';
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
