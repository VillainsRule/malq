import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class waroengmail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    token: string | null = null;

    async getDomains(): Promise<string[]> {
        const req = await fish('https://waroengmail.com/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        const [localPart, domain] = address.split('@');

        const req = await fish('https://waroengmail.com/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localPart, domain })
        });

        const res = await req.json() as { token: string };
        this.token = res.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://waroengmail.com/api/inbox/${this.token}`);
        const res = await req.json() as {
            messages: {
                id: string,
                from: string,
                subject: string,
                receivedAt: number
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.receivedAt
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://waroengmail.com/api/inbox/${this.token}/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { textBody: string, htmlBody: string };
                e.body = bodyRes.textBody || bodyRes.htmlBody;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}