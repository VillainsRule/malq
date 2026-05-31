import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class mailtemp$tech extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://mailtemp.tech/api/temp-mail/domains');
            const res = await req.json() as { domains: string[] };
            domainCache.set(res.domains);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://mailtemp.tech/api/temp-mail/inbox/${this.address}`);
        const res = await req.json() as {
            emails: {
                id: number,
                from: string,
                subject: string,
                time: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id.toString(),
            from: email.from,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.time).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://mailtemp.tech/api/temp-mail/inbox/${encodeURIComponent(this.address)}/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { text: string, html: string } };
                e.body = bodyRes.email.text || bodyRes.email.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}