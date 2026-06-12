import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

// UNFINISHED

export default class temporarymail$com extends Provider {
    bodies: Record<string, string> = {};

    $token = '';

    async getAddress(): Promise<string> {
        const domainReq = await this.fetch('https://temporarymail.com/api/?action=getDomains');
        const domainRes = await domainReq.json() as string[];

        const randomDomain = domainRes[Math.floor(Math.random() * domainRes.length)].toLowerCase();
        const email = `${getRandomName()}@${randomDomain}`;

        const tokenReq = await this.fetch(`https://temporarymail.com/api/?action=requestEmailAccess&key=&value=${encodeURIComponent(email)}`);
        const tokenRes = await tokenReq.json() as { secretKey: string };

        this.$token = tokenRes.secretKey;

        this.address = email;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://temporarymail.com/api/?action=checkInbox&value=${this.$token}`);
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
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.mail_id] || '',
            date: new Date(email.time).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://tempmail.plus/api/mails/${e.id}?email=${encodeURIComponent(this.address)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                e.body = bodyRes.text || bodyRes.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}