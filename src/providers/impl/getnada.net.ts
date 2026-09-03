import { parse } from 'node-html-parser';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class getnada$net implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://getnada.net');
        const res = await req.text();
        const dom = parse(res);

        return dom.querySelectorAll('option').map(e => e.getAttribute('value')).filter((e) => !!e && e.includes('.')) as string[];
    }

    async createInbox(address: string): Promise<void> {
        const openReq = await fish('https://getnada.net/api/inbox/open', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: address })
        });

        const openRes = await openReq.json() as { token: string };

        this.$token = openRes.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://getnada.net/api/inbox/messages', {
            headers: { 'Authorization': `Bearer ${this.$token}` }
        });

        const res = await req.json() as {
            messages: {
                id: string,
                subject: string,
                from_addr: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from_addr,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://getnada.net/api/inbox/message?id=${e.id}`, {
                headers: { 'Authorization': `Bearer ${this.$token}` }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { message: { text_plain: string, html_sanitized: string } };
                e.body = bodyRes.message.text_plain || bodyRes.message.html_sanitized;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}