import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class iwanta$email implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://iwanta.email/');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://iwanta.email/api/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            emails: {
                id: string,
                from: string,
                subject: string,
                text: string,
                html: string,
                receivedAt: string
            }[]
        };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.text || email.html,
            date: new Date(email.receivedAt).getTime()
        }));

        return returnableMail;
    }
}
