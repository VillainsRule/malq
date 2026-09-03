import parse from 'node-html-parser';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class surlCommons implements ProviderImpl {
    host = '';

    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish(`https://${this.host}`);
        const res = await req.text();

        const domains = res.match(/change_dropdown_list\(this\.innerHTML\)" id="(.*?)"/g) || [];
        const cleanedDomains = domains.map(d => d.match(/change_dropdown_list\(this\.innerHTML\)" id="(.*?)"/)?.[1] || '').filter(d => d);

        return cleanedDomains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [user, domain] = address.split('@');

        const req = await fish(`https://${this.host}`, {
            headers: { cookie: `embx=%5B%22${encodeURIComponent(address)}%22%5D; surl=${user}/${domain}` }
        });

        const res = await req.text();
        const dom = parse(res);

        const items = dom.querySelectorAll('.list-group-item');

        const returnableMail: Mail[] = items.map((item) => {
            const from = item.querySelector('div[class*="from_div_"]')?.text.trim() || '';
            const subject = item.querySelector('div[class*="subj_div_"]')?.text.trim() || '';
            const date = item.querySelector('div[class*="time_div_"]')?.text.trim() || '';

            if (from.toLowerCase() === 'from' || !from) return null;

            let id = item.getAttribute('href')?.split('/').pop();
            let body = '';
            if (!id) {
                if (res.includes('mess_number">1</')) {
                    id = res.match(/smurl\+"\/(.*?)"/)?.[1];
                    body = dom.querySelector('.mess_bodiyy')?.innerHTML || '';
                    if (id) this.bodies[id] = body;
                } else throw new Error(this.host + ' is broken, inaccurate mail info may be reported');
            }

            return {
                id,
                from,
                to: address,
                subject,
                body: this.bodies[id!] || body,
                date: toEST(new Date(date).getTime(), 0)
            };
        }).filter(e => Array.isArray(e) || e) as Mail[];

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://${this.host}/${domain}/${user}/${e.id}`, {
                headers: { cookie: `embx=%5B%22${encodeURIComponent(address)}%22%5D; surl=${domain}/${user}/${e.id}` }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                const bodyDOM = parse(bodyRes);
                const innerHTML = bodyDOM.querySelector('.mess_bodiyy')?.innerHTML || '';

                e.body = innerHTML;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}