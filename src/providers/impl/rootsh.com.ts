import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class rootsh$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $atExpression = '';
    $dotExpression = '';

    $cookie = '';

    async getDomains(): Promise<string[]> {
        const domainReq = await fish('https://rootsh.com');
        const domainRes = await domainReq.text();

        const allDomains = domainRes.match(/"javascript:;">(.*?)</g)!;
        return allDomains.map(e => e.match(/"javascript:;">(.*?)</)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const cookieReq = await fish('https://rootsh.com');
        const cookieRes = await cookieReq.text();

        this.$atExpression = cookieRes.match(/\.replace\("@","(.*?)"\)/)?.[1] || '';
        this.$dotExpression = cookieRes.match(/\.replace\("\.","(.*?)"\)/)?.[1] || '';

        const cookie = cookieReq.headers.getSetCookie();
        const sendableCookie = cookie.map((c: string) => c.split(';')[0]).join('; ');

        const activateReq = await fish('https://rootsh.com/applymail', {
            method: 'POST',
            body: `mail=${encodeURIComponent(address)}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: sendableCookie }
        });

        const cookie2 = activateReq.headers.getSetCookie();
        this.$cookie = cookie2.map((c: string) => c.split(';')[0]).join('; ');
    }

    async getMail(address: string): Promise<Mail[]> {
        const fetchReq = await fish('https://rootsh.com/getmail', {
            method: 'POST',
            body: `mail=${encodeURIComponent(address)}&time=0&_=${Date.now()}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: this.$cookie }
        });

        const fetchRes = await fetchReq.json() as {
            to: string;
            mail: [
                string,
                string /* from */,
                string /* subject */,
                string /* timestamp */,
                string /* email link (.eml) */,
                number
            ][]
        };

        const returnableMail: Mail[] = fetchRes.mail.map((email) => ({
            id: email[4],
            from: email[1],
            to: fetchRes.to,
            subject: email[2],
            body: this.bodies[email[4]] || '',
            date: toEST(new Date(email[3]).getTime(), 8)
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://rootsh.com/win/${encodeURIComponent(address.replace('@', this.$atExpression).replaceAll('.', this.$dotExpression))}/${e.id}`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                e.body = bodyRes.match(/.push\(\{\}\);<\/script><br\/><hr\/><br\/>(.*?)<br\/><hr\/><br\/><script async src=/s)?.[1]!;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}