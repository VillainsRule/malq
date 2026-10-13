import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class sacistudio$xyz implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://mail.sacistudio.xyz/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mail.sacistudio.xyz/api/messages?email=${encodeURIComponent(address)}`);
        const res = await req.json() as {
            messages: {
                id: string,
                from: string,
                subject: string,
                date: string | number,
                text: string,
                html: string
            }[]
        };

        return res.messages.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.html || email.text,
            date: new Date(email.date).getTime()
        }));
    }
}
