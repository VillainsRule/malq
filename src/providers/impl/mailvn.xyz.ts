import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const tls = { rejectUnauthorized: false };

export default class mailvn$xyz implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mailvn.xyz/', { tls });
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mailvn.xyz/checkmail.php?mail=${encodeURIComponent(address)}&latest_id=0`, { tls });
        const res = await req.json() as { success: boolean, emails: { id: string, from: string, subject: string, date: string }[] };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: String(email.id),
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: toEST(new Date(email.date).getTime(), 7)
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://mailvn.xyz/viewmail.php?id=${e.id}`, { tls }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { body: string } };
                e.body = bodyRes.email.body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
