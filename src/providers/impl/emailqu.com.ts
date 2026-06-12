import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class emailqu$com extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://emailqu.com/api/domains');
            const res = await req.json() as { domains: { domain: string, is_verified: boolean }[] };
            domainCache.set(res.domains.filter(e => e.is_verified).map(e => e.domain));
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://emailqu.com/api/public/emails/${encodeURIComponent(this.address)}`);
        const res = await req.json() as {
            emails: {
                from: string,
                subject: string
                body_text: string,
                body_html: string,
                received_at: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            from: email.from,
            to: this.address,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.received_at).getTime()
        }));

        return returnableMail;
    }
}