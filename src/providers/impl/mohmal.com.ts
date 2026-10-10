import { parse } from 'node-html-parser';

import { fish } from '@/util/util';

import CookieJar from '@/util/CookieJar';

import type { Mail, ProviderImpl } from '../Provider';

const headers = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' };

export default class mohmal$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $jar = new CookieJar();

    async getDomains(): Promise<string[]> {
        const req = await fish('https://www.mohmal.com/en', { headers });
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]).filter(d => d.includes('.'));
    }

    async createInbox(address: string): Promise<void> {
        const [name, domain] = address.split('@');

        const req = await fish('https://www.mohmal.com/en/create', {
            method: 'POST',
            redirect: 'manual',
            headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
            body: `name=${name}&domain=${domain}`
        });

        this.$jar.addSetCookie(req.headers.getSetCookie());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://www.mohmal.com/en/inbox', { headers: { ...headers, cookie: this.$jar.getCookie() } });
        const res = await req.text();

        const rows = parse(res).querySelectorAll('tr[data-msg-id]');

        const returnableMail: Mail[] = rows.map((row) => {
            const id = row.getAttribute('data-msg-id')!;
            const time = row.querySelector('.time')!.text.trim().match(/(\d+):(\d+):(\d+) (AM|PM)/)!;
            const hour = (Number(time[1]) % 12) + (time[4] === 'PM' ? 12 : 0);
            const site = new Date(Date.now() + 3 * 3600000);
            let date = Date.UTC(site.getUTCFullYear(), site.getUTCMonth(), site.getUTCDate(), hour, Number(time[2]), Number(time[3])) - 3 * 3600000;
            if (date > Date.now() + 60000) date -= 86400000;

            return {
                id,
                from: this.decodeEmail(row.querySelector('.sender [data-cfemail]')?.getAttribute('data-cfemail') || '') || row.querySelector('.sender')!.text.trim(),
                to: address,
                subject: row.querySelector('.subject')!.text.trim(),
                body: this.bodies[id] || '',
                date
            };
        });

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await fish(`https://www.mohmal.com/en/message/${e.id}`, { headers: { ...headers, cookie: this.$jar.getCookie() } });
                e.body = await bodyReq.text();
                this.bodies[e.id] = e.body;
            }

            return e;
        }));

        return finalMail;
    }

    decodeEmail = (hex: string): string => {
        if (!hex) return '';
        const key = parseInt(hex.slice(0, 2), 16);
        let out = '';
        for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
        return out;
    };
}
