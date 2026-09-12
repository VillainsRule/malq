import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mailregcl$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    serverTime: string;

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailregcl.com/api/domain_list', { tls: { rejectUnauthorized: false } });
        const res = await req.json() as { data: { domain_name: string }[] };

        return res.data.map(e => e.domain_name);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [username, domain] = address.split('@');

        const req = await fish('https://mailregcl.com/messages', {
            method: 'POST',
            body: this.serverTime ? `username=${username}&domain=${domain}&update=${this.serverTime}` : `username=${username}&domain=${domain}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            tls: { rejectUnauthorized: false }
        });

        const res = await req.json() as {
            result: {
                id: number,
                from: string,
                subject: string,
                date: string
            }[]
        };

        const returnableMail: Mail[] = res.result.map((email) => ({
            id: email.id.toString(),
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: toEST(new Date(email.date).getTime(), 0)
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish('https://mailregcl.com/messages', {
                method: 'POST',
                body: `id=${e.id}&username=${username}&domain=${domain}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                tls: { rejectUnauthorized: false }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                e.body = bodyRes.slice(1, -1).replaceAll('\\/', '/').replaceAll('\\"', '"');
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}