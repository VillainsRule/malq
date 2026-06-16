import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class tempmail$io$vn extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://tempmail.io.vn');
            const res = await req.text();

            const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
            const cleanDomains = matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);

            domainCache.set(cleanDomains);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://temp-mail.louisnguyen198x.workers.dev/emails/${encodeURIComponent(this.address)}`);
        const res = await req.json() as {
            result: {
                id: string,
                from_address: string,
                to_address: string,
                subject: string,
                received_at: number
            }[]
        };

        const returnableMail: Mail[] = res.result.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: email.to_address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.received_at * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://temp-mail.louisnguyen198x.workers.dev/inbox/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { result: { text_content: string, html_content: string } };
                e.body = bodyRes.result.text_content || bodyRes.result.html_content;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}