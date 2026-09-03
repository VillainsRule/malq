import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class _10minemail$com implements ProviderImpl {
    $token = '';

    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        return [];
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://web2.10minemail.com/mailbox', { method: 'POST' });
        const res = await req.json() as { mailbox: string, token: string };

        this.$token = res.token;
        address = res.mailbox;

        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://web2.10minemail.com/messages', {
            headers: { 'Authorization': `Bearer ${this.$token}` }
        });

        const res = await req.json() as {
            mailbox: string;
            messages: {
                _id: string,
                receivedAt: number,
                from: string,
                subject: string
            }[];
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email._id,
            from: email.from,
            to: res.mailbox,
            subject: email.subject,
            body: this.bodies[email._id] || '',
            date: email.receivedAt * 1000
        }));

        const finalMail = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await fish(`https://web2.10minemail.com/messages/${e.id}`, {
                    headers: { 'Authorization': `Bearer ${this.$token}` }
                });

                const bodyRes = await bodyReq.json() as { bodyHtml: string };

                e.body = bodyRes.bodyHtml;
                this.bodies[e.id!] = e.body;
            }

            return e;
        }));

        return finalMail;
    }
}