import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class driftz$net extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://api.driftz.net/domains');
            const res = await req.json() as { result: { public: string[] } };
            domainCache.set(res.result.public);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://api.driftz.net/emails/${this.address}?limit=100`);
        const res = await req.json() as {
            result: {
                items: {
                    id: string,
                    fromAddress: string,
                    toAddress: string,
                    subject: string,
                    receivedAt: number
                }[]
            }
        }

        const returnableMail: Mail[] = res.result.items.map((email) => ({
            id: email.id,
            from: email.fromAddress,
            to: email.toAddress,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.receivedAt * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://api.driftz.net/inbox/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { result: { textContent: string, htmlContent: string } };
                e.body = bodyRes.result.textContent || bodyRes.result.htmlContent;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}