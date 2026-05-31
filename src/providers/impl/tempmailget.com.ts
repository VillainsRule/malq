import { StringDomainCache } from '@/util/domainCache.ts';

import getRandomName from '@/util/names.ts';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class tempmailget$com extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://tempmailget.com/api/domains');
            const res = await req.json() as { domains: string[] };
            domainCache.set(res.domains);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://tempmailget.com/api/emails/refresh?address=${encodeURIComponent(this.address)}`, { method: 'POST' });
        const res = await req.json() as {
            from: string,
            to: string,
            subject: string,
            date: string,
            textContent: string,
            htmlContent: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.textContent || email.htmlContent,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}