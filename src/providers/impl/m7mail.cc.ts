import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class m7mail$cc implements ProviderImpl {
    bodies: Record<string, string> = {};

    $deviceId = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://m7mail.cc/api/domains');
        const res = await req.json() as { domains: { name: string, is_active: boolean }[] };

        return res.domains.filter(d => d.is_active).map(d => d.name);
    }

    async createInbox(_address: string): Promise<void> {
        const req = await fish('https://m7mail.cc/api/device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: crypto.randomUUID() })
        });

        const res = await req.json() as { device_id: string };
        this.$deviceId = res.device_id;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://m7mail.cc/api/inbox/${address}?device_id=${this.$deviceId}`);
        const res = await req.json() as {
            emails: {
                id: string,
                from_address: string,
                subject: string,
                received_at: string
            }[] | null
        };

        const returnableMail: Mail[] = (res.emails || []).map((email) => ({
            id: email.id,
            from: email.from_address,
            to: address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://m7mail.cc/api/email/${e.id}?device_id=${this.$deviceId}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { email: { body_text: string, body_html: string } };
                e.body = bodyRes.email.body_text || bodyRes.email.body_html;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}
