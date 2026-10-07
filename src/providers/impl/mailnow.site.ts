import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailnow$site implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailnow.site/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mailnow.site/api/inbox/${encodeURIComponent(address)}/messages`);
        const res = await req.json() as {
            messages: {
                id: number,
                sender: string,
                subject: string,
                created_at: string,
                text_body: string,
                html_body: string
            }[]
        };

        return res.messages.map((email) => ({
            id: String(email.id),
            from: email.sender,
            to: address,
            subject: email.subject,
            body: email.text_body || email.html_body,
            date: new Date(email.created_at.replace(' ', 'T') + 'Z').getTime()
        }));
    }
}
