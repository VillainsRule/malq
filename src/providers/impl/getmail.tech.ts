import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class getmail$tech implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://getmail.tech/api/get-domains?category=all');
        const res = await req.json() as { domains: { domain: string, active: boolean }[] };

        return res.domains.filter(d => d.active).map(d => d.domain);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://getmail.tech/api/emails/${encodeURIComponent(address)}?headers=true`);
        const res = await req.json() as {
            emails: {
                id: string,
                from: string,
                subject: string,
                date: string
            }[]
        };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.date).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://getmail.tech/api/emails/${encodeURIComponent(address)}/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { text: string, html: string } };
                e.body = bodyRes.email.text || bodyRes.email.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
