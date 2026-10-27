import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class sengare$art implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://sengare.art/');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]).filter(d => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d));
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [box, domain] = address.split('@');
        const req = await fish(`https://sengare.art/api/messages?box=${encodeURIComponent(box)}&domain=${encodeURIComponent(domain)}`);
        const res = await req.json() as {
            messages: {
                id: string,
                sender: string,
                subject: string,
                created_at: number
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.sender,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.created_at * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://sengare.art/api/message?id=${encodeURIComponent(e.id)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { html: string, text: string };
                e.body = bodyRes.html || bodyRes.text;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
