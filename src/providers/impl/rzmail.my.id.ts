import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class rzmail$my$id implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://rzmail.my.id/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        await fish(`https://rzmail.my.id/api/custom/${address}`);
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://rzmail.my.id/api/inboxes/${address}/messages`);
        const res = await req.json() as {
            messages: {
                id: string,
                from_address: string,
                subject: string,
                body_html: string,
                body_text: string,
                created_at: string
            }[]
        };

        return res.messages.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: address,
            subject: email.subject,
            body: email.body_html || email.body_text,
            date: new Date(email.created_at.replace(' ', 'T') + 'Z').getTime()
        }));
    }
}
