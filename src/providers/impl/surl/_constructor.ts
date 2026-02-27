import parse from 'node-html-parser';
import { getRandomName } from '../../../util/names';

import Provider, { type Mail } from '../../Provider';

export default class surlCommons extends Provider {
    host = '';

    $domain = '';
    $user = '';

    fullBodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch(`https://${this.host}`);
        const res = await req.text();

        const domains = res.match(/change_dropdown_list\(this\.innerHTML\)" id="(.*?)"/g) || [];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        const domain = randomDomain.match(/change_dropdown_list\(this\.innerHTML\)" id="(.*?)"/)![1];

        const user = getRandomName();

        this.address = `${user}@${domain}`;
        this.$domain = domain;
        this.$user = user;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://${this.host}`, {
            headers: { cookie: `embx=%5B%22${encodeURIComponent(this.address!)}%22%5D; surl=${this.$domain}/${this.$user}` }
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
                    if (id) this.fullBodies[id] = body;
                } else throw new Error(this.host + ' is broken, inaccurate mail info may be reported');
            }

            return {
                id,
                from,
                to: this.address!,
                subject,
                body: this.fullBodies[id!] || body,
                date: new Date(date).getTime()
            };
        }).filter(e => Array.isArray(e) || e) as Mail[];

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://${this.host}/${this.$domain}/${this.$user}/${e.id}`, {
                headers: { cookie: `embx=%5B%22${encodeURIComponent(this.address!)}%22%5D; surl=${this.$domain}/${this.$user}/${e.id}` }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                const bodyDOM = parse(bodyRes);
                const innerHTML = bodyDOM.querySelector('.mess_bodiyy')?.innerHTML || '';

                e.body = innerHTML;
                this.fullBodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}