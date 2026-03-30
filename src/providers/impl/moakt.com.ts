import parse from 'node-html-parser';

import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class moakt$com extends Provider {
    bodies: Record<string, string> = {};
    dates: Record<string, number> = {};

    $cookie = '';

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://moakt.com');
            const res = await req.text();

            const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
            const cleanDomains = matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);

            domainCache.set(cleanDomains);
        }

        const domain = domainCache.pull();
        const name = getRandomName();

        this.address = `${name}@${domain}`;

        const activateReq = await this.fetch('https://moakt.com/en/inbox', {
            method: 'POST',
            body: `domain=${domain}&username=${name}&setemail=&preferred_domain=disbox.net`,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            redirect: 'manual'
        });

        const rawCookie = activateReq.headers.getSetCookie();
        const cookie = rawCookie[0].split(';')[0];

        this.$cookie = cookie;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://moakt.com/en/inbox', {
            headers: { cookie: this.$cookie }
        });

        const res = await req.text();
        const dom = parse(res);

        const table = dom.querySelector('.tm-table');
        const hasMessages = table?.children[1].innerText;
        if (hasMessages?.trim().startsWith('No messages in your inbox at the moment.')) return [];

        const validKids = table?.children.filter(e => e.children[1])!;

        const returnableMail: Mail[] = validKids.map((kid) => {
            const subject = kid.children[0].innerText;
            if (subject.trim() === 'Message Title') return;

            const sender = kid.children[1].innerText.trim().slice(4, -4);
            const href = kid.children[0].children[0].getAttribute('href')!;

            return {
                id: href,
                from: sender.trim(),
                to: this.address,
                subject: subject.trim(),
                body: this.bodies[href] || '',
                date: this.dates[href] || 0
            }
        }).filter(e => typeof e === 'object') as Mail[];

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.date && e.id) await this.fetch(`https://moakt.com${e.id}`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                const bodyDOM = parse(bodyRes);

                const dateElement = bodyDOM.querySelector('.date')!.querySelector('span')!.innerText;
                const date = new Date(dateElement).getTime();

                e.date = date;
                this.dates[e.id!] = e.date;
            });

            if (!e.body && e.id) await this.fetch(`https://moakt.com${e.id}/content`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                const bodyDOM = parse(bodyRes);

                const html = bodyDOM.outerHTML.trim();

                e.body = html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}