import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailforspams$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailforspams.com/api/v1/domains');
        const res = await req.json() as string[];

        return res;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [username] = address.split('@');

        const req = await fish(`https://mailforspams.com/api/v1/mailbox/${username}`);
        const res = await req.json() as {
            id: string,
            from: string,
            to: string[],
            subject: string,
            date: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.from.replace('\u003c', '').replace('\u003e', ''),
            to: email.to[0].replace('\u003c', '').replace('\u003e', ''),
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.date).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://mailforspams.com/api/v1/mailbox/${username}/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body: { text: string, html: string } };
                e.body = bodyRes.body.text || bodyRes.body.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}