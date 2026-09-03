import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class onetempmail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://onetempmail.com/api/domains');
        const res = await req.json() as string[];
        return res;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://onetempmail.com/api/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            id: string,
            sender: string,
            subject: string,
            created_at: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: toEST(new Date(email.created_at).getTime(), 0)
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://onetempmail.com/api/email/${e.id}?email=${encodeURIComponent(address)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string | null, body_html: string };
                e.body = bodyRes.body_text || bodyRes.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}