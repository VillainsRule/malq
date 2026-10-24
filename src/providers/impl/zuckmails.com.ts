import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class zuckmails$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://zuckmails.com/api/domains');
        const res = await req.json() as { data: { domain: string, is_premium: boolean, allowed_plans: string[] }[] };

        return res.data.filter(d => !d.is_premium && !d.allowed_plans?.length).map(d => d.domain);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://zuckmails.com/api/emails/${address}/inbox`);
        const res = await req.json() as {
            data: {
                messages: {
                    id: string,
                    sender: string,
                    subject: string,
                    body_text: string,
                    body_html: string,
                    received_at: string
                }[]
            }
        };

        return res.data.messages.map((email) => ({
            id: email.id,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: email.body_html || email.body_text,
            date: new Date(email.received_at).getTime()
        }));
    }
}
