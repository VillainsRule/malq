import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class temporam$com extends Provider {
    date: string = '';

    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://temporam.com/api/domains', {
                headers: { 'Referer': 'https://temporam.com/' }
            });

            const res = await req.json() as { data: { domain: string }[] };
            domainCache.set(res.data.map(d => d.domain));
        }

        this.date = new Date().toISOString();
        this.address = `${getRandomName()}@${domainCache.pull()}`;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://temporam.com/api/emails?email=${encodeURIComponent(this.address)}&since=${this.date}&limit=50`, {
            headers: { 'Referer': 'https://temporam.com/' }
        });

        const res = await req.json() as {
            data: {
                id: number,
                fromEmail: string,
                toEmail: string,
                subject: string,
                createdAt: string
            }[]
        };

        const returnableMail: Mail[] = res.data.map((email) => ({
            id: email.id.toString(),
            from: email.fromEmail,
            to: email.toEmail,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.createdAt).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://temporam.com/api/emails/${e.id}`, {
                headers: { 'Referer': 'https://temporam.com/' }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { content: string, summary: string } };
                e.body = bodyRes.data.content || bodyRes.data.summary;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}