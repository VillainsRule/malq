import parse from 'node-html-parser';

import { fish } from '@/util/util';

import CookieJar from '@/util/CookieJar';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailegzz$com implements ProviderImpl {
    $jar = new CookieJar();

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailegzz.com/');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const homeReq = await fish('https://mailegzz.com/', { redirect: 'manual' });
        this.$jar.addSetCookie(homeReq.headers.getSetCookie());

        const [user, domain] = address.split('@');

        const req = await fish('https://mailegzz.com/', {
            method: 'POST',
            redirect: 'manual',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                cookie: this.$jar.getCookie()
            },
            body: `user=${user}&domain=${domain}&save_email=`
        });

        this.$jar.addSetCookie(req.headers.getSetCookie());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://mailegzz.com/public/inbox.php', { headers: { cookie: this.$jar.getCookie() } });
        const res = await req.text();

        const nowAsia = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const today = nowAsia.toISOString().slice(0, 10);

        return parse(res).querySelectorAll('div[onclick^="openMail"]').map((item) => {
            const time = item.querySelector('span.text-slate-300')?.text.trim() || '00:00';

            let date = new Date(`${today}T${time}:00Z`).getTime() - 7 * 60 * 60 * 1000;
            if (date > Date.now() + 60 * 1000) date -= 24 * 60 * 60 * 1000;

            return {
                from: item.querySelector('.t-from')?.text.trim() || '',
                to: address,
                subject: item.querySelector('.t-subject')?.text.trim() || '',
                body: item.querySelector('.raw-body')?.text || '',
                date
            };
        });
    }
}
