import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class osakan$tokyo implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://osakan.tokyo/');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains
            .map(d => d.match(/<option value="(.*?)">/)![1])
            .filter(d => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d))
            .filter(d => !/^(vip|pro)\./.test(d));
    }

    async createInbox(address: string): Promise<void> {
        const [prefix, domain] = address.split('@');

        await fish('https://osakan.tokyo/api/public/create', {
            method: 'POST',
            body: JSON.stringify({ prefix, domain, ttlMinutes: 1440 }),
            headers: { 'content-type': 'application/json' }
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://osakan.tokyo/api/public/inbox/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            messages: {
                id: string,
                sender: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://osakan.tokyo/api/public/inbox/${encodeURIComponent(address)}/messages/${encodeURIComponent(e.id)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { html_body: string, text_body: string };
                e.body = bodyRes.html_body || bodyRes.text_body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
