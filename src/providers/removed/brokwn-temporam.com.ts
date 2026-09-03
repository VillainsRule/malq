import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class temporam$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $date: string = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://temporam.com/api/domains', {
            headers: { 'Referer': 'https://temporam.com/' }
        });

        const res = await req.json() as { data: { domain: string }[] };
        return res.data.map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        this.$date = new Date().toISOString();
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://temporam.com/api/emails?email=${encodeURIComponent(address)}&since=${this.$date}&limit=50`, {
            headers: { 'Referer': 'https://temporam.com/' }
        });

        const res = await req.json() as {
            data: {
                id: number,
                fromEmail: string,
                toEmail: string,
                subject: string,
                createdAt: string
            }[]
        };

        const returnableMail: Mail[] = res.data.map((email) => ({
            id: email.id.toString(),
            from: email.fromEmail,
            to: email.toEmail,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.createdAt).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://temporam.com/api/emails/${e.id}`, {
                headers: { 'Referer': 'https://temporam.com/' }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { content: string, summary: string } };
                e.body = bodyRes.data.content || bodyRes.data.summary;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}