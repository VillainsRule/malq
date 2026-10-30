import { fish } from '@/util/util';

import CookieJar from '@/util/CookieJar';

import type { Mail, ProviderImpl } from '../Provider';

export default class fakemailo$com implements ProviderImpl {
    $jar = new CookieJar();
    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://fakemailo.com/temp-mail/get-domain');
        return await req.json() as string[];
    }

    async createInbox(_address: string): Promise<void> {
        const req = await fish('https://fakemailo.com/');
        const res = await req.text();

        this.$jar.addSetCookie(req.headers.getSetCookie());
        this.$token = res.match(/id="requestToken"[\s\S]*?value="(.*?)"/)![1];
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://fakemailo.com/temp-mail/get-email', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-request-token': this.$token,
                cookie: this.$jar.getCookie()
            },
            body: JSON.stringify({ email: address })
        });

        this.$jar.addSetCookie(req.headers.getSetCookie());
        this.$token = req.headers.get('x-new-request-token') || this.$token;

        const res = await req.json() as { data: { from: string, subject: string, content: string, date: string }[] };

        return (res.data || []).map((email) => ({
            from: email.from.replace(/"/g, ''),
            to: address,
            subject: email.subject,
            body: email.content,
            date: new Date(email.date).getTime()
        }));
    }
}
