import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailtemp$tech implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailtemp.tech/api/temp-mail/domains');
        const res = await req.json() as { domains: string[] };
        
        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mailtemp.tech/api/temp-mail/inbox/${address}`);
        const res = await req.json() as {
            emails: {
                id: number,
                from: string,
                subject: string,
                time: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id.toString(),
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.time).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://mailtemp.tech/api/temp-mail/inbox/${encodeURIComponent(address)}/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { text: string, html: string } };
                e.body = bodyRes.email.text || bodyRes.email.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}