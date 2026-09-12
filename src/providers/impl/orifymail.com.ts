import { parse } from 'node-html-parser';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class orifymail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://orifymail.com');
        const res = await req.text();
        const dom = parse(res);

        const mainChunkURL = dom.querySelectorAll('script').map(e => e.getAttribute('src')).find(e => e && e.includes('page-'))!;
        const mainChunkReq = await fish(`https://orifymail.com${mainChunkURL}`);
        const mainChunk = await mainChunkReq.text();

        const matchedDomains = mainChunk.match(/"Input";let [A-Z]=\["(.*?)"\]/)![1]!;
        const domains = matchedDomains.split('","') as string[];

        return domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://orifymail.com/api/email/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            id: string,
            subject: string,
            createdAt: number,
            fromAddress: string,
            toAddress: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.fromAddress,
            to: email.toAddress,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.createdAt
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://orifymail.com/api/inbox/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { textContent: string, htmlContent: string };
                e.body = bodyRes.textContent || bodyRes.htmlContent;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}