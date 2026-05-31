import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class mailmomy$com extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://mailmomy.com/api/domains/active');
            const res = await req.json() as string[];
            domainCache.set(res);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://mailmomy.com/api/mail/messages?to=${this.address}&page=1&limit=20`);
        const res = await req.json() as {
            emails: {
                recipient: string,
                from: string,
                subject: string
                message: string,
                bodyText: string,
                receivedAt: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            from: email.from,
            to: email.recipient,
            subject: email.subject,
            body: email.bodyText || email.message,
            date: new Date(email.receivedAt).getTime()
        }));

        return returnableMail;
    }
}