import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class trytempmail$top implements ProviderImpl {
    bodies: Record<string, string> = {};

    token: string;

    async getDomains(): Promise<string[]> {
        const req = await fish('https://trytempmail.top/api/domains');
        const res = await req.json() as { domains: { domain: string, is_private: boolean }[] };

        return res.domains.filter(d => !d.is_private).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        const req = await fish('https://trytempmail.top/api/mailbox/create', {
            method: 'POST',
            body: JSON.stringify({ username, domain }),
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await req.json() as { mailbox: { token: string } };
        this.token = res.mailbox.token;
    }

    async getMail(_address: string): Promise<Mail[]> {
        const req = await fish(`https://trytempmail.top/api/mailbox/${this.token}/messages`);
        const res = await req.json() as {
            messages: {
                id: string,
                sender: string,
                recipient: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.sender,
            to: email.recipient,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://trytempmail.top/api/mailbox/${this.token}/messages/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { message: { text_body: string, html_body: string } };
                e.body = bodyRes.message.text_body || bodyRes.message.html_body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}