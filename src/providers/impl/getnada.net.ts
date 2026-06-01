import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class getnada$net extends Provider {
    bodies: Record<string, string> = {};

    token = '';

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://getnada.net');
            const res = await req.text();

            const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
            const cleanDomains = matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);

            domainCache.set(cleanDomains);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;

        const openReq = await this.fetch('https://getnada.net/api/inbox/open', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: this.address })
        });

        const openRes = await openReq.json() as { token: string };

        this.token = openRes.token;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://getnada.net/api/inbox/messages', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        const res = await req.json() as {
            messages: {
                id: string,
                subject: string,
                from_addr: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from_addr,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://getnada.net/api/inbox/message?id=${e.id}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { message: { text_plain: string, html_sanitized: string } };
                e.body = bodyRes.message.text_plain || bodyRes.message.html_sanitized;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}