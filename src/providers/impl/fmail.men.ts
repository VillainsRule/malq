import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class fmail$men implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://fmail.men/api/config');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [name, domain] = address.split('@');

        const req = await fish(`https://fmail.men/api/inbox/${name}?domain=${domain}`);
        const res = await req.json() as {
            emails: {
                token: string,
                sender: string,
                subject: string,
                received_at: number
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.token,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: this.bodies[email.token] || '',
            date: email.received_at
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://fmail.men/api/email/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string, body_html: string };
                e.body = bodyRes.body_text || bodyRes.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}