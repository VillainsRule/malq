import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class noopmail$org extends Provider {
    $domain = '';
    $email = '';

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://noopmail.org/api/d');
            const res = await req.json() as string[];
            domainCache.set(res);
        }

        this.$domain = domainCache.pull();
        this.$email = getRandomName();

        this.address = `${this.$email}@${this.$domain}`;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://noopmail.org/api/c', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ d: this.$domain, e: this.$email })
        });

        const res = await req.json() as {
            from: string,
            to: string,
            subject: string,
            text: string,
            date: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.text,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}