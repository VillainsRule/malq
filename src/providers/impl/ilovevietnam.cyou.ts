import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class ilovevietnam$cyou implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://ilovevietnam.cyou/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        const [name, domain] = address.split('@');

        await fish(`https://ilovevietnam.cyou/api/generate?domain=${domain}&address=${name}`);
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://ilovevietnam.cyou/api/emails/${encodeURIComponent(address)}`);
        const res = await req.json() as { emails: { id: number, from: string, subject: string, date: string }[] };

        return Promise.all(res.emails.map(async (email) => {
            if (!this.bodies[email.id]) {
                const bodyReq = await fish(`https://ilovevietnam.cyou/api/email/${encodeURIComponent(address)}/${email.id}`);
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                this.bodies[email.id] = bodyRes.html || bodyRes.text;
            }

            return {
                id: String(email.id),
                from: email.from,
                to: address,
                subject: email.subject,
                body: this.bodies[email.id],
                date: new Date(email.date.replace(' ', 'T') + 'Z').getTime()
            };
        }));
    }
}
