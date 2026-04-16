import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

// UNFINISHED

export default class yopmail$com extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://yopmail.com/domain?d=all');
        const res = await req.text();

        const matchedDomains = res.match(/<div>@(.*?)<\/div>/g) || [];
        const randomDomain = matchedDomains[Math.floor(Math.random() * matchedDomains.length)];
        const domain = randomDomain.match(/<div>@(.*?)<\/div>/)![1];

        const name = getRandomName();

        const ypReq = await this.fetch('https://yopmail.com/');
        const ypRes = await ypReq.text();

        const initialCookies = ypReq.headers.get('set-cookie');
        const iCookies2 = initialCookies?.split(',').map((c) => c.split(';')[0].trim()).join('; ')!;

        const yp = ypRes.match(/id="yp" value="(.*?)"/)?.[1];

        const cookieReq = await this.fetch('https://yopmail.com/', {
            method: 'POST',
            body: `yp=${yp}&login=${name}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: iCookies2 }
        });

        const rawCookies = cookieReq.headers.get('set-cookie');
        const sendableCookies = rawCookies?.split(',').map((c) => c.split(';')[0].trim()).join('; ');

        const cookieRes = await cookieReq.text();
        const currentVersion = cookieRes.match(/ver = '(.*?)';/)?.[1];

        return '';
    }

    async getMail(): Promise<Mail[]> {
        return [];
    }
}