import { fish, toEST } from '@/util/util';

import CookieJar from '@/util/CookieJar';

import type { Mail, ProviderImpl } from '../Provider';

export default class anonymmail$net implements ProviderImpl {
    inboxHistory: Mail[] = [];

    $jar = new CookieJar();
    $csrfToken = '';

    async getDomains(): Promise<string[]> {
        const csrfReq = await fish('https://anonymmail.net/');
        const csrfRes = await csrfReq.text();

        const req = await fish('https://anonymmail.net/api/getDomains', {
            method: 'POST',
            headers: {
                cookie: csrfReq.headers.getSetCookie().map(e => e.split(';')[0]).join('; '),
                'x-requested-with': 'XMLHttpRequest',
                'x-csrf-token': csrfRes.match(/name="csrf_test_name" value="(.*?)"/)![1],
            }
        });

        const res = await req.json() as { domain: string }[];
        return res.map(e => e.domain);
    }

    async createInbox(address: string): Promise<void> {
        const csrfReq = await fish('https://anonymmail.net/');
        const csrfRes = await csrfReq.text();

        this.$jar.addSetCookie(csrfReq.headers.getSetCookie());
        this.$csrfToken = csrfRes.match(/name="csrf_test_name" value="(.*?)"/)![1];

        const req = await fish('https://anonymmail.net/api/create', {
            method: 'POST',
            body: `email=${encodeURIComponent(address)}`,
            headers: {
                'cookie': this.$jar.getCookie(),
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://anonymmail.net',
                'x-requested-with': 'XMLHttpRequest',
                'x-csrf-token': this.$csrfToken
            }
        });

        this.$jar.addSetCookie(req.headers.getSetCookie());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://anonymmail.net/api/get', {
            method: 'POST',
            body: `email=${encodeURIComponent(address)}`,
            headers: {
                'cookie': this.$jar.getCookie(),
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://anonymmail.net',
                'x-requested-with': 'XMLHttpRequest',
                'x-csrf-token': this.$csrfToken
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
            date: toEST(new Date(email.date.replace(/(\d+)\/(\d+)\/(\d+)/, '$2-$1-$3')).getTime(), 3)
        }));

        this.inboxHistory.push(...inboxAdditions);

        return this.inboxHistory;
    }
}