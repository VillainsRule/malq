import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const headers = {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'origin': 'https://afhamxmailz.com',
    'referer': 'https://afhamxmailz.com/'
};

export default class afhamxmailz$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://api.afhamxmailz.com/domains', { headers });
        const res = await req.json() as { domain: string, tier: string, status: string }[];

        return res.filter(d => d.status === 'active' && d.tier === 'free').map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        const req = await fish('https://api.afhamxmailz.com/inbox/generate', {
            method: 'POST',
            headers: { ...headers, 'content-type': 'application/json' },
            body: JSON.stringify({ username, domain })
        });

        if (!req.ok) throw new Error('afhamxmailz.com: createInbox: ' + await req.text());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://api.afhamxmailz.com/emails/${address}`, { headers });
        const res = await req.json() as {
            emails: {
                id: string,
                from_address: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at + 'Z').getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://api.afhamxmailz.com/emails/message/${e.id}`, { headers }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body_text: string, body_html: string };
                e.body = bodyRes.body_text || bodyRes.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
