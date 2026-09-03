import parse from 'node-html-parser';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class moakt$com implements ProviderImpl {
    bodies: Record<string, string> = {};
    dates: Record<string, number> = {};

    $cookie = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://moakt.com');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const [name, domain] = address.split('@');

        const activateReq = await fish('https://moakt.com/en/inbox', {
            method: 'POST',
            body: `domain=${domain}&username=${name}&setemail=&preferred_domain=disbox.net`,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            redirect: 'manual'
        });

        const rawCookie = activateReq.headers.getSetCookie();
        const cookie = rawCookie[0].split(';')[0];

        this.$cookie = cookie;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://moakt.com/en/inbox', {
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
                to: address,
                subject: subject.trim(),
                body: this.bodies[href] || '',
                date: this.dates[href] || 0
            }
        }).filter(e => typeof e === 'object') as Mail[];

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if ((!e.date || !e.body) && e.id) await fish(`https://moakt.com${e.id}/plain`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                const bodyDOM = parse(bodyRes);

                const dateElement = bodyDOM.querySelector('.date')!.querySelector('span')!.innerText;
                const date = toEST(new Date(dateElement).getTime(), 0);

                e.date = date;
                this.dates[e.id!] = e.date, 0;

                const emailElement = bodyDOM.querySelector('.email-body')!.innerHTML.trim();

                e.body = emailElement;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}