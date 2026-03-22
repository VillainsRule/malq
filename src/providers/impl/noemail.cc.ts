import parse from 'node-html-parser';

import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class noemail$cc extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://noemail.cc');
            const res = await req.text();

            const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
            const cleanDomains = matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);

            domainCache.set(cleanDomains);
        }

        this.address = `${getRandomName()}@${domainCache.pull()}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://noemail.cc/' + this.address);
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
                date: new Date(dateStamp).getTime()
            }
        });

        return returnableMail;
    }
}