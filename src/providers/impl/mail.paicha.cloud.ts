import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mail$paicha$cloud implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mail.paicha.cloud/change_mailbox', {
            method: 'POST',
            body: JSON.stringify({ domain: 'temporary-mail.paicha.cloud' }),
            headers: { 'content-type': 'application/json' }
        });

        const res = await req.json() as { domains: string[] };
        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mail.paicha.cloud/api/${encodeURIComponent(address)}`);

        const res = await req.json() as {
            id: string,
            from: string,
            subject: string,
            created_at: string,
            inbox: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: toEST(new Date(email.created_at).getTime(), 0)
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://mail.paicha.cloud/api/mailbox/${encodeURIComponent(address)}/mail/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body: string, html_body: string };
                e.body = bodyRes.body || bodyRes.html_body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}