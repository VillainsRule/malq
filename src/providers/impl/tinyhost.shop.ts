import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class tinyhost$shop extends Provider {
    $domain = '';
    $email = '';

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://tinyhost.shop/api/random-domains/?page=1&limit=1');
            const res = await req.json() as { domains: string[] };
            domainCache.set(res.domains);
        }

        this.$domain = domainCache.pull();
        this.$email = getRandomName();
        this.address = `${this.$email}@${this.$domain}`;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://tinyhost.shop/api/email/${this.$domain}/${this.$email}/?page=1&limit=50`);
        const res = await req.json() as {
            emails: {
                id: string,
                sender: string,
                subject: string,
                body: string,
                html_body: string,
                date: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            from: email.sender,
            to: this.address,
            subject: email.subject,
            body: email.body || email.html_body,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}