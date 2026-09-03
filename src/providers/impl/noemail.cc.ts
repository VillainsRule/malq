import parse from 'node-html-parser';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class noemail$cc implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://noemail.cc');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://noemail.cc/' + address);
        const res = await req.text();
        const dom = parse(res);

        const messages = dom.querySelectorAll('.card.mt-4');

        const returnableMail: Mail[] = messages.map((kid) => {
            const details = kid.children[0].innerText.trim().split('\n');
            const dateStamp = details[6].replace('email headers', '').trim().slice(10);

            return {
                from: details[2].trim().slice(6),
                to: details[0].trim().slice(4),
                subject: details[4].trim().slice(9),
                body: kid.querySelector('.card-text')?.innerHTML.trim() || '',
                date: toEST(new Date(dateStamp).getTime(), 0)
            }
        });

        return returnableMail;
    }
}