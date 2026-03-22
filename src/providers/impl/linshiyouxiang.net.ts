import { StringDomainCache } from '@/util/domainCache';
import wafFetch from '@/util/waf/fetch';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class linshiyouxiang$net extends Provider {
    $cookie: string = '';
    $code: string = '';

    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const req = await wafFetch('https://linshiyouxiang.net/get-domains');
            const res = await req.json() as { items: { domain: string, type: 'domain' | 'gmail_alias', is_vip: boolean }[] }[];
            const validDomains = res.map(e => e.items).flat(1).filter(e => !e.is_vip && e.type === 'domain');
            domainCache.set(validDomains.map(d => d.domain));
        }

        const domain = domainCache.pull();
        const user = getRandomName();

        const cookieReq = await wafFetch('https://linshiyouxiang.net');
        const initialCookies = [...cookieReq.headers['set-cookie']].map((c) => c.split(';')[0].trim()).join('; ');

        const saveReq = await wafFetch('https://linshiyouxiang.net/save-custom-mail', {
            method: 'POST',
            body: JSON.stringify({ username: user, domain }),
            headers: { 'content-type': 'application/json', cookie: initialCookies }
        });

        const allCookies = [...saveReq.headers['set-cookie']].map((c) => c.split(';')[0].trim()).join('; ');
        this.$cookie = allCookies;

        const codeReq = await wafFetch('https://linshiyouxiang.net', {
            headers: { cookie: allCookies }
        });

        const codeRes = codeReq.text();

        this.$code = codeRes.match(/activeMailCode = '(.*?)'/)?.[1] || '';

        this.address = `${user}@${domain}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await wafFetch('https://linshiyouxiang.net/get-messages', {
            method: 'POST',
            body: JSON.stringify({ email: this.address, code: this.$code }),
            headers: { 'content-type': 'application/json', cookie: this.$cookie }
        });

        const res = await req.json() as {
            emails: {
                Code: string,
                FromEmail: string,
                Subject: string,
                SendTime: number
            }[] | null;
        }

        const returnableMail: Mail[] = (res.emails || []).map((email) => ({
            id: email.Code,
            from: email.FromEmail,
            to: this.address,
            subject: email.Subject,
            body: this.bodies[email.Code] || '',
            date: email.SendTime * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await wafFetch(`https://linshiyouxiang.net/mail/view/${e.id}`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = bodyReq.text();
                const bodyMatch = bodyRes.match(/<div id="content-wrapper">([\s\S]*?)<\/div>/s);
                const body = bodyMatch ? bodyMatch[1].trim()
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"')
                    .replace(/\\\//g, '/') : '';

                e.body = body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}