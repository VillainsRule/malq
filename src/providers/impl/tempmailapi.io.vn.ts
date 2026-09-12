import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmailapi$io$vn implements ProviderImpl {
    bodies: Record<string, string> = {};

    password: string;

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmailapi.io.vn');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains.filter(m => m.includes('.')).map(d => d.match(/<option value="(.*?)">/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const [user, domain] = address.split('@');

        const req = await fish(`https://tempmailapi.io.vn/api.php?action=create&user=${user}&domain=${domain}`);
        const res = await req.json() as { password: string };

        this.password = res.password;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [user, domain] = address.split('@');

        const req = await fish(`https://tempmailapi.io.vn/api.php?user=${user}&domain=${domain}&limit=50&password=${this.password}`);
        const res = await req.json() as {
            emails: {
                id: string,
                from: string,
                subject: string,
                date: string
            }[]
        };

        const returnableMail: Mail[] = res.emails.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.date).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://tempmailapi.io.vn/api.php?action=list&user=${user}&domain=${domain}&email_id=${e.id}&password=${this.password}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body: string };
                e.body = bodyRes.body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}