import parse from 'node-html-parser';

import CookieJar from '@/util/CookieJar';
import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class generator$email implements ProviderImpl {
    host = 'generator.email';

    bodies: Record<string, string> = {};

    jar = new CookieJar();

    async $context(path: string): Promise<CookieJar> {
        const jar = new CookieJar();

        const req = await fish(`https://${this.host}/${path}`, { redirect: 'manual' });
        jar.addSetCookie(req.headers.getSetCookie());
        jar.addSetCookie([`inbox_ctx=${encodeURIComponent(path)}`]);

        return jar;
    }

    async getDomains(): Promise<string[]> {
        const tokenReq = await fish(`https://${this.host}`);
        const tokenRes = await tokenReq.text();

        const req = await fish(`https://${this.host}/api/domains.php`, {
            headers: {
                'referer': `https://${this.host}/`,
                'x-api-token': tokenRes.match(/name="api-token" content="(.*?)"/)![1]
            }
        });
        const res = await req.json() as { ascii: string, idn: false }[];

        return res.filter(e => !e.idn).map(e => e.ascii);
    }

    async createInbox(address: string): Promise<void> {
        const [user, domain] = address.split('@');

        this.jar = await this.$context(`${domain}/${user}`);
    }

    async getMail(address: string): Promise<Mail[]> {
        const [user, domain] = address.split('@');

        const req = await fish(`https://${this.host}/${domain}/${user}`, {
            headers: { cookie: this.jar.getCookie(), 'referer': `https://${this.host}/` }
        });

        const res = await req.text();
        const dom = parse(res);

        const items = dom.querySelectorAll('.list-group-item-success, #mail-summary-head');

        const returnableMail: Mail[] = items.map((item) => {
            const from = item.querySelector('div[class*="from_div_"]')?.text.trim() || '';
            const subject = item.querySelector('div[class*="subj_div_"]')?.text.trim() || '';
            const date = item.querySelector('div[class*="time_div_"]')?.text.trim() || '';

            if (from.toLowerCase() === 'from' || !from) return null;

            const id = item.getAttribute('onclick')?.match(/loadInboxClientSide\('.*?\/(\w+)'\)/)?.[1]
                || dom.querySelector('.mailsrc[data-mid]')?.getAttribute('data-mid');

            const body = dom.querySelector('#mail-summary-body .mess_bodiyy')?.innerHTML || '';
            if (id && body) this.bodies[id] = body;

            if (!id) throw new Error(this.host + ' is broken, inaccurate mail info may be reported');

            return {
                id,
                from,
                to: address,
                subject,
                body: this.bodies[id],
                date: toEST(new Date(date).getTime(), 0)
            };
        }).filter(e => Array.isArray(e) || e) as Mail[];

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const jar = await this.$context(`${domain}/${user}/${e.id}`);

                const bodyReq = await fish(`https://${this.host}/${domain}/${user}/${e.id}`, {
                    headers: { cookie: jar.getCookie(), 'referer': `https://${this.host}/` }
                });

                const bodyDOM = parse(await bodyReq.text());

                e.body = bodyDOM.querySelector('.mess_bodiyy')?.innerHTML || '';
                this.bodies[e.id] = e.body;
            }

            return e;
        }));

        return finalMail;
    }
}
