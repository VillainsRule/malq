import parse from 'node-html-parser';

import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

export default class altaddress$org extends Provider {
    $cookie = '';

    dates: Record<string, number> = {};
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://altaddress.org');
        const res = await req.text();

        const domainMatches = res.match(/<option value="(.*?)"/g) || [];
        const uniqueMatches = [...new Set(domainMatches)].filter(e => e.includes('.'));
        const randomDomain = uniqueMatches[Math.floor(Math.random() * uniqueMatches.length)];
        const domain = randomDomain.match(/<option value="(.*?)"/)![1];

        const user = getRandomName();

        const loginReq = await this.fetch('https://altaddress.org/login', {
            method: 'POST',
            body: `email=${user}&domain=${domain}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            redirect: 'manual'
        });

        this.$cookie = loginReq.headers.get('set-cookie')?.split(';')[0]!;

        this.address = `${user}@${domain}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://altaddress.org/inbox`, {
            headers: { cookie: this.$cookie }
        });

        const res = await req.text();
        const dom = parse(res);

        const container = dom.querySelector('#inbox-messagelist-container');
        if (container?.innerText.startsWith('Mailbox is empty')) return [];

        const messages: Mail[] = dom.querySelectorAll('.message-fields').map((e) => {
            const id = e.querySelector('.message-subject')!.children[0].getAttribute('href')!;

            return {
                id,
                from: e.querySelector('.message-from')!.innerText.trim(),
                to: this.address,
                subject: e.querySelector('.message-subject')!.innerText.trim(),
                date: this.dates[id] || Date.now(),
                body: this.bodies[id] || ''
            }
        });

        const finalMessages: Mail[] = await Promise.all(messages.map(async (m) => {
            if (!m.date && m.id) {
                const bodyReq = await this.fetch(`https://altaddress.org${m.id}`, {
                    headers: { cookie: this.$cookie }
                });

                const bodyRes = await bodyReq.text();
                const bodyDom = parse(bodyRes);

                const dateText = bodyDom.querySelector('tbody')!.children[2].children[1].innerText;
                const date = new Date(dateText).getTime();
                m.date = date;
                this.dates[m.id] = date;
            }

            if (!m.body && m.id) {
                const bodyReq = await this.fetch(`https://altaddress.org${m.id}/getContent/1/remote/1`, {
                    headers: { cookie: this.$cookie }
                });

                const bodyRes = await bodyReq.text();
                const bodyDom = parse(bodyRes);

                const body = bodyDom.querySelector('.message')!.children[0].innerHTML;
                m.body = body;
                this.bodies[m.id] = body;
            }

            return m;
        }));

        return finalMessages;
    }
}