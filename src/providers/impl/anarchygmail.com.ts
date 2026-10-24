import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class anarchygmail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://anarchygmail.com/api/domains');
        const res = await req.json() as { domains: { name: string }[] };

        return res.domains.map(d => d.name);
    }

    async createInbox(address: string): Promise<void> {
        const [prefix, domain] = address.split('@');

        await fish('https://anarchygmail.com/api/inbox/create', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ prefix, domain })
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://anarchygmail.com/api/messages?email=${address}`);
        const res = await req.json() as {
            messages: {
                id: number,
                sender: string,
                subject: string,
                created_at: string
            }[]
        };

        return Promise.all(res.messages.map(async (email) => {
            if (!this.bodies[email.id]) {
                const bodyReq = await fish(`https://anarchygmail.com/api/message/${email.id}?email=${address}`);
                const bodyRes = await bodyReq.json() as { message: { body: string } };
                this.bodies[email.id] = bodyRes.message.body;
            }

            return {
                id: String(email.id),
                from: email.sender,
                to: address,
                subject: email.subject,
                body: this.bodies[email.id],
                date: new Date(email.created_at.replace(' ', 'T') + 'Z').getTime()
            };
        }));
    }
}
