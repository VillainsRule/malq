import parse from 'node-html-parser';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const headers = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' };

export default class altaddress$org implements ProviderImpl {
    dates: Record<string, number> = {};
    bodies: Record<string, string> = {};

    $cookie = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://altaddress.org', { headers });
        const res = await req.text();

        const domainMatches = res.match(/<option value="(.*?)"/g) || [];
        const uniqueMatches = [...new Set(domainMatches)].filter(e => e.includes('.') && !e.includes('xn--'));

        return uniqueMatches.map((e) => e.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const [user, domain] = address.split('@');

        const loginReq = await fish('https://altaddress.org/login', {
            method: 'POST',
            body: `email=${user}&domain=${domain}`,
            headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
            redirect: 'manual'
        });

        this.$cookie = loginReq.headers.get('set-cookie')?.split(';')[0]!;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://altaddress.org/inbox`, {
            headers: { ...headers, cookie: this.$cookie }
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
                to: address,
                subject: e.querySelector('.message-subject')!.innerText.trim(),
                date: this.dates[id] || Date.now(),
                body: this.bodies[id] || ''
            }
        });

        const finalMessages: Mail[] = await Promise.all(messages.map(async (m) => {
            if (!m.date && m.id) {
                const bodyReq = await fish(`https://altaddress.org${m.id}`, {
                    headers: { ...headers, cookie: this.$cookie }
                });

                const bodyRes = await bodyReq.text();
                const bodyDom = parse(bodyRes);

                const dateText = bodyDom.querySelector('tbody')!.children[2].children[1].innerText;
                const date = new Date(dateText).getTime();
                m.date = date;
                this.dates[m.id] = date;
            }

            if (!m.body && m.id) {
                const bodyReq = await fish(`https://altaddress.org${m.id}/getContent/1/remote/1`, {
                    headers: { ...headers, cookie: this.$cookie }
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