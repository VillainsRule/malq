import wafFetch from '@/util/waf/fetch';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailyra$com implements ProviderImpl {
    $cookie = '';

    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        return [];
    }

    async createInbox(address: string): Promise<void> {
        const req = await wafFetch('https://mailyra.com/en/');
        const res = req.text();

        const domains = res.match(/"domains":\["(.*?)"\]/)?.[1].split('","') || [];
        const domain = domains[domains.length * Math.random() | 0];

        this.$cookie = req.cookies[0].split(';')[0];

        const emailReq = await wafFetch('https://mailyra.com/en/api/new.php', {
            method: 'POST',
            body: `domain=${encodeURIComponent(domain)}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: this.$cookie }
        });

        const emailRes = await emailReq.json() as { data: { inbox: { email: string } } };

        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await wafFetch(`https://mailyra.com/en/api/list.php`, {
            headers: { cookie: this.$cookie }
        });

        const res = await req.json() as {
            data: {
                messages: {
                    id: number,
                    from_email: string,
                    subject: string,
                    received_at: string
                }[]
            }
        };

        const returnableMail: Mail[] = res.data.messages.map((email) => ({
            id: email.id.toString(),
            from: email.from_email,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if ((!e.body || !e.from) && e.id) await wafFetch(`https://mailyra.com/en/api/view.php?id=${e.id}`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { mail: { body_text: string, body_html: string } } };
                e.body = bodyRes.data.mail.body_text || bodyRes.data.mail.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}