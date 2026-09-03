import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class emailqu$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fetch('https://emailqu.com/api/domains');
        const res = await req.json() as { domains: { domain: string, is_verified: boolean }[] };

        const identifiedDomains = res.domains.filter(e => e.is_verified).map(e => e.domain.toLowerCase());
        const dedupedDomains = [...new Set(identifiedDomains)];

        return dedupedDomains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://emailqu.com/api/public/emails/${encodeURIComponent(address)}`);
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
            to: address,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.received_at).getTime()
        }));

        return returnableMail;
    }
}