import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailporary$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    $getHeaders() {
        const t = new Uint8Array(16);
        crypto.getRandomValues(t);
        const requestID = Array.from(t, r => r.toString(16).padStart(2, '0')).join('');
        const requestTime = Math.floor(Date.now() / 1e3)
        return { 'x-request-id': requestID, 'x-timestamp': requestTime.toString() };
    }

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailporary.com');
        const res = await req.text();

        return res.match(/emailDomains:"\[(.*?)\]"/)?.[1].split(',').map((e) => e.replace(/\\"/g, '').trim()) || [];
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://mailporary.com');
        const res = await req.text();

        const token = res.match(/"(eyJ[^"]+)"/)?.[1];
        this.$token = token || '';
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://web.mailporary.com/api/v1/mailbox/${encodeURIComponent(address)}`, {
            headers: { Authorization: `Bearer ${this.$token}`, ...this.$getHeaders() }
        });

        const res = await req.json() as {
            mailbox: string,
            id: string,
            from: string,
            subject: string,
            date: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.from,
            to: email.mailbox,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.date).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://web.mailporary.com/api/v1/mailbox/${encodeURIComponent(address)}/${e.id}`, {
                headers: { Authorization: `Bearer ${this.$token}`, ...this.$getHeaders() }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body: { text: string | null, html: string } };
                e.body = bodyRes.body.text || bodyRes.body.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}