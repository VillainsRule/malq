import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class tempmailv5$site extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://tempmailv5.site/domains');
            const res = await req.json() as { domains: string[] };
            domainCache.set(res.domains);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://tempmailv5.site/inbox/${encodeURIComponent(this.address)}`);
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
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.created_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://tempmailv5.site/mail/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string };
                e.body = bodyRes.body_text;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}