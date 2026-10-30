import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class akses$email implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('http://akses.email/');
        const res = await req.text();

        return res.match(/data-domains="(.*?)"/)![1].split(',');
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        await fish('http://akses.email/api/mail/custom', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username, domain })
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`http://akses.email/api/mail/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            emails: {
                id: string,
                from: string,
                subject: string,
                html: string,
                text: string,
                date: string
            }[]
        };

        return res.emails.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.html || email.text,
            date: new Date(email.date).getTime()
        }));
    }
}
