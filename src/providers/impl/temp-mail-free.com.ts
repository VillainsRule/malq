import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class temp$mail$free$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://temp-mail-free.com/api/random-domains?page=1&limit=100');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [user, domain] = address.split('@');

        const req = await fish(`https://temp-mail-free.com/api/email/${domain}/${user}/?page=1&limit=50`);
        const res = await req.json() as {
            emails: {
                id: string,
                from: string,
                subject: string,
                body: string,
                html_body: string,
                date: string
            }[]
        };

        return res.emails.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.html_body || email.body,
            date: new Date(email.date).getTime()
        }));
    }
}
