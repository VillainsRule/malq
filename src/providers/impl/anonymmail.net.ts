import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class anonymmail$net implements ProviderImpl {
    inboxHistory: Mail[] = [];

    $cookie: string;

    async getDomains(): Promise<string[]> {
        const req = await fish('https://anonymmail.net/api/getDomains');
        const res = await req.json() as { domain: string }[];

        return res.map(e => e.domain);
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://anonymmail.net/api/create', {
            method: 'POST',
            body: `email=${encodeURIComponent(address)}`,
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://anonymmail.net'
            }
        });

        this.$cookie = req.headers.getSetCookie().map(e => e.split(';')[0]).join('; ');
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://anonymmail.net/api/get', {
            method: 'POST',
            body: `email=${encodeURIComponent(address)}`,
            headers: {
                'cookie': this.$cookie,
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://anonymmail.net'
            }
        });

        const res = await req.json() as {
            [address: string]: {
                created_at: string;
                emails: {
                    subject: string;
                    from: string;
                    date: string;
                    body: string;
                }[]
            }
        };

        const inboxAdditions: Mail[] = Object.values(res)[0].emails.map((email) => ({
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.body,
            date: toEST(new Date(email.date).getTime(), -4269)
        }));

        this.inboxHistory.push(...inboxAdditions);

        return this.inboxHistory;
    }
}