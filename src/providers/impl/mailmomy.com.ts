// inconsistent dates - remove sometime?

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailmomy$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailmomy.com/api/domains/active');
        const res = await req.json() as string[];

        return res;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mailmomy.com/api/mail/messages?to=${address}&page=1&limit=20`);
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