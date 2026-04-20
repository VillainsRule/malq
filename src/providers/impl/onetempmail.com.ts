import { StringDomainCache } from '@/util/domainCache.ts';

import getRandomName from '@/util/names.ts';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class onetempmail$com extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://onetempmail.com/api/domains');
            const res = await req.json() as string[];
            domainCache.set(res);
        }

        const email = `${getRandomName().slice(0, 10)}@${domainCache.pull()}`;

        this.address = email;
        return email;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://onetempmail.com/api/inbox/${encodeURIComponent(this.address)}`);
        const res = await req.json() as {
            id: string,
            sender: string,
            subject: string,
            created_at: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.sender,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.created_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://onetempmail.com/api/email/${e.id}?email=${encodeURIComponent(this.address)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string | null, body_html: string };
                e.body = bodyRes.body_text || bodyRes.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}