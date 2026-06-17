import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

export default class rootsh$com extends Provider {
    $cookie = '';

    atExpression = '';
    dotExpression = '';

    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const domainReq = await this.fetch('https://rootsh.com');
        const domainRes = await domainReq.text();

        this.atExpression = domainRes.match(/\.replace\("@","(.*?)"\)/)?.[1] || '';
        this.dotExpression = domainRes.match(/\.replace\("\.","(.*?)"\)/)?.[1] || '';

        const cookie = domainReq.headers.getSetCookie();
        const sendableCookie = cookie.map((c: string) => c.split(';')[0]).join('; ');

        const allDomains = domainRes.match(/"javascript:;">(.*?)</g)!;
        const randomDomain = allDomains[allDomains.length * Math.random() | 0];
        const domain = randomDomain.match(/"javascript:;">(.*?)</)?.[1]!;

        const name = getRandomName();
        const email = `${name}@${domain}`;

        const activateReq = await this.fetch('https://rootsh.com/applymail', {
            method: 'POST',
            body: `mail=${encodeURIComponent(email)}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: sendableCookie }
        });

        const activateRes = await activateReq.json() as { user: string };

        const cookie2 = activateReq.headers.getSetCookie();
        this.$cookie = cookie2.map((c: string) => c.split(';')[0]).join('; ');

        this.address = activateRes.user;
        return activateRes.user;
    }

    async getMail(): Promise<Mail[]> {
        const fetchReq = await this.fetch('https://rootsh.com/getmail', {
            method: 'POST',
            body: `mail=${encodeURIComponent(this.address)}&time=0&_=${Date.now()}`,
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
            date: this.toEST(new Date(email[3]).getTime(), 8)
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://rootsh.com/win/${encodeURIComponent(this.address.replace('@', this.atExpression).replaceAll('.', this.dotExpression))}/${e.id}`, {
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