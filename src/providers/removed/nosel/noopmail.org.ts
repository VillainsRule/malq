import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class noopmail$org implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://noopmail.org/api/d');
        const res = await req.json() as string[];

        return res;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [user, domain] = address.split('@');

        const req = await fish('https://noopmail.org/api/c', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ d: domain, e: user })
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