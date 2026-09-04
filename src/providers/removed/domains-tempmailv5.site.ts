import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmailv5$site implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmailv5.site/domains');
        const res = await req.json() as { domains: string[] };
        
        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://tempmailv5.site/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            mails: {
                id: string,
                from: string,
                to: string,
                subject: string,
                created_at: string
            }[]
        }

        console.log(res);

        const returnableMail: Mail[] = res.mails.map((email) => ({
            id: email.id.toString(),
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.created_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://tempmailv5.site/mail/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string };
                e.body = bodyRes.body_text;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}