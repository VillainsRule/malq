import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class _365hmail$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://365hmail.com/');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://365hmail.com/api/mail/messages?to=${encodeURIComponent(address)}`);
        const res = await req.json() as {
            key: string,
            from: string,
            to: string,
            subject: string,
            message: string,
            receivedAt: string
        }[];

        return res.map((email) => ({
            id: email.key,
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.message,
            date: new Date(email.receivedAt).getTime()
        }));
    }
}
