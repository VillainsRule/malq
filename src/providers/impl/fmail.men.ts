import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class fmail$men extends Provider {
    bodies: Record<string, string> = {};

    name = '';
    domain = '';

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://fmail.men/api/config');
            const res = await req.json() as { domains: string[] };
            domainCache.set(res.domains);
        }

        this.name = getRandomName();
        this.domain = domainCache.pull();

        this.address = `${this.name}@${this.domain}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://fmail.men/api/inbox/${this.name}?domain=${this.domain}`);
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
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.token] || '',
            date: email.received_at * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://fmail.men/api/email/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string, body_html: string };
                e.body = bodyRes.body_text || bodyRes.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}