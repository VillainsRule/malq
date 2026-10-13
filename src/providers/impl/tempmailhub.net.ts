import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmailhub$net implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmailhub.net/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://tempmailhub.net/api/messages?address=${encodeURIComponent(address)}&limit=50&ttl=600`);
        const res = await req.json() as {
            messages: {
                id: string,
                sender: string,
                recipient: string,
                subject: string,
                body: string,
                html: string,
                time: string
            }[]
        };

        return res.messages.map((email) => ({
            id: email.id,
            from: email.sender,
            to: email.recipient,
            subject: email.subject,
            body: email.html || email.body,
            date: new Date(email.time).getTime()
        }));
    }
}
