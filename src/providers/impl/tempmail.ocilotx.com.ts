import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmail$ocilotx$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmail.ocilotx.com/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://tempmail.ocilotx.com/api/inbox?email=${address}`);
        const res = await req.json() as {
            emails: {
                from: string,
                subject: string,
                html: string,
                text: string,
                date: string
            }[]
        };

        return res.emails.map((email) => ({
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.html || email.text,
            date: new Date(email.date).getTime()
        }));
    }
}
