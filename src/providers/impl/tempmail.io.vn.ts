import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmail$io$vn implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmail.io.vn');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://temp-mail.louisnguyen198x.workers.dev/emails/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            result: {
                id: string,
                from_address: string,
                to_address: string,
                subject: string,
                received_at: number
            }[]
        };

        const returnableMail: Mail[] = res.result.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: email.to_address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.received_at * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://temp-mail.louisnguyen198x.workers.dev/inbox/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { result: { text_content: string, html_content: string } };
                e.body = bodyRes.result.text_content || bodyRes.result.html_content;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}