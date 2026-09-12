import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmail$ai implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://www.tempmail.ai/api/common-api/v1/temp-mail/domains');
        const res = await req.json() as { data: string[] };

        return res.data;
    }

    async createInbox(address: string): Promise<void> {
        const [local_part, domain] = address.split('@');

        await fish('https://www.tempmail.ai/api/common-api/v1/temp-mail/session', {
            method: 'POST',
            body: JSON.stringify({ local_part, domain }),
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const [username] = address.split('@');

        const req = await fish(`https://www.tempmail.ai/api/common-api/v1/temp-mail/inbox?local_part=${username}`);
        const res = await req.json() as {
            data: {
                mails: {
                    id: string,
                    from_addr: string,
                    subject: string,
                    received_at: number
                }[]
            }
        };

        const returnableMail: Mail[] = res.data.mails.map((email) => ({
            id: email.id,
            from: email.from_addr,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at * 1000).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://www.tempmail.ai/api/common-api/v1/temp-mail/mail/${e.id}?local_part=${username}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { text_body: string, html: string } };
                e.body = bodyRes.data.text_body || bodyRes.data.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}