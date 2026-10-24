import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class draxon$one implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://draxon.one/api/mail/v1/public/domains');
        const res = await req.json() as { domains: { name: string, mx_ok: boolean }[] };

        return res.domains.filter(d => d.mx_ok).map(d => d.name);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://draxon.one/api/mail/v1/public/mailboxes/${encodeURIComponent(address)}/messages?limit=25`);
        const res = await req.json() as {
            data: {
                id: string,
                from_address: string,
                subject: string,
                received_at: string
            }[]
        };

        return Promise.all(res.data.map(async (email) => {
            if (!this.bodies[email.id]) {
                const bodyReq = await fish(`https://draxon.one/api/mail/v1/public/mailboxes/${encodeURIComponent(address)}/messages/${email.id}`);
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                this.bodies[email.id] = bodyRes.html || bodyRes.text;
            }

            return {
                id: email.id,
                from: email.from_address,
                to: address,
                subject: email.subject,
                body: this.bodies[email.id],
                date: new Date(email.received_at).getTime()
            };
        }));
    }
}
