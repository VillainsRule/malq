import { fish } from '@/util/util';

import CookieJar from '@/util/CookieJar';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmailc$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $jar = new CookieJar();

    headers = () => ({
        'cookie': this.$jar.getCookie(),
        'referer': 'https://tempmailc.com/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
    });

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmailc.com');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return [...new Set(matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]).filter(e => e.includes('.')))];
    }

    async createInbox(_address: string): Promise<void> {
        const req = await fish('https://tempmailc.com', { headers: this.headers() });
        this.$jar.addSetCookie(req.headers.getSetCookie());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://tempmailc.com/api/inbox?email=${encodeURIComponent(address)}`, { headers: this.headers() });
        const res = await req.json() as {
            messages: {
                id: string,
                from: string,
                subject: string,
                ts: number
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.ts * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://tempmailc.com/api/message?email=${encodeURIComponent(address)}&msg_id=${e.id}`, { headers: this.headers() }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                e.body = bodyRes.text || bodyRes.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}