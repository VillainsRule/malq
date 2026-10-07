import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmail$cloud implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmail.cloud/api/config');
        const res = await req.json() as { domains: { domain: string, active: boolean, privateOwnerId?: string | null }[] };

        return res.domains.filter(d => d.active && !d.privateOwnerId).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const [localPart, domain] = address.split('@');

        const req = await fish('https://tempmail.cloud/api/mailboxes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'origin': 'https://tempmail.cloud',
                'referer': 'https://tempmail.cloud/',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({ localPart, domain, password: crypto.randomUUID() + 'Aa1!' })
        });

        const res = await req.json() as { token?: string, error?: string };
        if (!res.token) throw new Error('tempmail.cloud: createInbox: ' + res.error);

        this.$token = res.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://tempmail.cloud/api/messages', { headers: { Authorization: `Bearer ${this.$token}` } });
        const res = await req.json() as {
            messages: {
                id: string,
                from: string,
                subject: string,
                receivedAt: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.receivedAt).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://tempmail.cloud/api/messages/${encodeURIComponent(e.id)}`, { headers: { Authorization: `Bearer ${this.$token}` } }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                e.body = bodyRes.text || bodyRes.html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
