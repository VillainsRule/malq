import { parse } from 'node-html-parser';

import { fish } from '@/util/util';

import CookieJar from '@/util/CookieJar';

import type { Mail, ProviderImpl } from '../Provider';

const headers = {
    'origin': 'https://mail123.click',
    'referer': 'https://mail123.click/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
};

export default class mail123$click implements ProviderImpl {
    bodies: Record<string, string> = {};

    $jar = new CookieJar();
    $box = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mail123.click/', { headers });
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return [...new Set(matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]))];
    }

    async createInbox(address: string): Promise<void> {
        const [box, domain] = address.split('@');

        const homeReq = await fish('https://mail123.click/', { headers });
        const homeRes = await homeReq.text();

        this.$jar.addSetCookie(homeReq.headers.getSetCookie());

        const req = await fish('https://mail123.click/', {
            method: 'POST',
            redirect: 'manual',
            headers: { ...headers, 'cookie': this.$jar.getCookie(), 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ csrf_token: homeRes.match(/name="csrf_token" value="(.*?)"/)![1], box, domain }).toString()
        });

        this.$jar.addSetCookie(req.headers.getSetCookie());
        this.$box = box;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mail123.click/_partials/mailbox/${this.$box}/list?page=1`, {
            headers: { ...headers, 'cookie': this.$jar.getCookie(), 'hx-request': 'true' }
        });

        const cards = parse(await req.text()).querySelectorAll('a.ecard');

        return Promise.all(cards.map(async (card) => {
            const id = card.getAttribute('href')!.split('/').pop()!;

            if (!this.bodies[id]) {
                const bodyReq = await fish(`https://mail123.click/mail/${this.$box}/${id}/html`, { headers: { ...headers, 'cookie': this.$jar.getCookie() } });
                this.bodies[id] = await bodyReq.text();
            }

            return {
                id,
                from: card.getAttribute('data-sender')!,
                to: address,
                subject: card.querySelector('.ecard-subject')!.text.trim(),
                body: this.bodies[id],
                date: new Date(card.getAttribute('data-date')!).getTime()
            };
        }));
    }
}
