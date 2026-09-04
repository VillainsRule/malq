import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class vip$215$im implements ProviderImpl {
    bodies: Record<string, string> = {};

    cookie = '';
    token = '';

    async getDomains(): Promise<string[]> {
        return [];
    }

    async createInbox(address: string): Promise<void> {
        const cookieReq = await fish('https://vip.215.im/');
        this.cookie = cookieReq.headers.getSetCookie().map(e => e.split(';')[0]).join('; ');

        const mailReq = await fish('https://vip.215.im/api/temp-inbox', {
            method: 'POST',
            headers: { 'cookie': this.cookie, 'Referer': 'https://vip.215.im/' }
        });

        const mailRes = await mailReq.json() as { data: { address: string, token: string } };

        address = mailRes.data.address;
        this.token = mailRes.data.token;

        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://vip.215.im/v1/messages', {
            headers: { 'authorization': `Bearer ${this.token}`, 'cookie': this.cookie, 'Referer': 'https://vip.215.im/' }
        });

        const res = await req.json() as {
            data: {
                messages: {
                    id: string,
                    from: { address: string },
                    subject: string,
                    createdAt: string
                }[]
            }
        }

        const returnableMail: Mail[] = res.data.messages.map((email) => ({
            id: email.id,
            from: email.from.address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.createdAt).getTime()
        }));

        const finalMail = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await fish(`https://vip.215.im/v1/messages/${e.id}`, {
                    headers: { 'authorization': `Bearer ${this.token}`, 'cookie': this.cookie, 'Referer': 'https://vip.215.im/' }
                });
                const bodyRes = await bodyReq.json() as { data: { html: string[] } };
                e.body = bodyRes.data.html.join('\n');
                this.bodies[e.id!] = e.body;
            }

            return e;
        }));

        return finalMail;
    }
}