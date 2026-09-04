import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class spoofmail$de implements ProviderImpl {
    bodies: Record<string, string> = {};

    $cookie: string = '';
    $xsrfToken: string = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://spoofmail.de');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://spoofmail.de');
        const res = await req.text();

        const [user, domain] = address.split('@');

        const token = res.match(/name="_token" value="(.*?)"/)?.[1] || '';
        const initialCookies = req.headers.getSetCookie()?.map((c) => c.split(';')[0].trim()).join('; ');

        const saveReq = await fish('https://spoofmail.de/login', {
            method: 'POST',
            body: `_token=${token}&username=${user}&domain=${domain}&submit=`,
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                cookie: initialCookies
            },
            redirect: 'manual'
        });

        const allCookies = saveReq.headers.getSetCookie().map((c) => c.split(';')[0].trim()).join('; ');
        this.$cookie = this.mergeCookie(initialCookies, allCookies);

        void 0;
    }

    mergeCookie(cookie1: string, cookie2: string): string {
        const cookieMap: Record<string, string> = {};

        cookie1.split(';').forEach((c) => {
            const [key, value] = c.trim().split('=');
            cookieMap[key] = value;
        });

        cookie2.split(';').forEach((c) => {
            const [key, value] = c.trim().split('=');
            cookieMap[key] = value;
        });

        const xsrfToken = cookieMap['XSRF-TOKEN'];
        if (xsrfToken) this.$xsrfToken = xsrfToken;

        return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://spoofmail.de/api/mailbox', {
            headers: {
                cookie: this.$cookie
            }
        });

        const res = await req.json() as {
            messages: {
                subject: string,
                from: string[],
                created_at: number[],
                id: string
            }[] | null;
        }

        const newCookie = req.headers.getSetCookie()?.map((c) => c.split(';')[0].trim()).join('; ') || '';
        this.$cookie = this.mergeCookie(this.$cookie, newCookie);

        const returnableMail: Mail[] = (res.messages || []).map((email) => ({
            id: email.id,
            from: email.from[0],
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.created_at[0] * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://spoofmail.de/api/mailbox/read?id=${e.id}`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                const bodyMatch = bodyRes.match(/<body>(.*?)<\/body>/s);
                const body = bodyMatch ? bodyMatch[1].trim() : '';

                e.body = body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}