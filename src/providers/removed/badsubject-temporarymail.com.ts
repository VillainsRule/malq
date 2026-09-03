import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

// UNFINISHED

export default class temporarymail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        const domainReq = await fish('https://temporarymail.com/api/?action=getDomains');
        const domainRes = await domainReq.json() as string[];

        return domainRes;
    }

    async createInbox(address: string): Promise<void> {
        const tokenReq = await fish(`https://temporarymail.com/api/?action=requestEmailAccess&key=&value=${encodeURIComponent(address)}`);
        const tokenRes = await tokenReq.json() as { secretKey: string };

        this.$token = tokenRes.secretKey;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://temporarymail.com/api/?action=checkInbox&value=${this.$token}`);
        const res = await req.json() as {
            mail_list: {
                mail_id: number,
                from_mail: string,
                subject: string,
                time: string
            }[]
        }

        const returnableMail: Mail[] = res.mail_list.map((email) => ({
            id: email.mail_id.toString(),
            from: email.from_mail,
            to: address,
            subject: email.subject,
            body: this.bodies[email.mail_id] || '',
            date: new Date(email.time).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://tempmail.plus/api/mails/${e.id}?email=${encodeURIComponent(address)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                e.body = bodyRes.text || bodyRes.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}