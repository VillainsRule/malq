import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class tempmailc$com extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://tempmailc.com');
            const res = await req.text();

            const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
            const cleanDomains = matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);

            domainCache.set(cleanDomains);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://tempmailc.com/api/inbox?email=${encodeURIComponent(this.address)}`);
        const res = await req.json() as {
            messages: {
                id: string,
                from: string,
                subject: string,
                ts: number
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.ts * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://tempmailc.com/api/message?email=${encodeURIComponent(this.address)}&msg_id=${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                e.body = bodyRes.text || bodyRes.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}