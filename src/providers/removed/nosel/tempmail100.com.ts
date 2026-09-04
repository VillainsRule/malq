import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class tempmail100$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';

    async getDomains(): Promise<string[]> {
        return [];
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://tempmail100.com/init', { method: 'POST' });
        const res = await req.json() as { data: { token: string } };

        this.$token = res.data.token;

        const addressReq = await fish('https://tempmail100.com/web/generate', {
            method: 'POST',
            headers: { 'Authorization': this.$token }
        });
        const addressRes = await addressReq.json() as { data: { address: string } };

        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://tempmail100.com/web/emails', {
            headers: { 'Authorization': this.$token }
        });
        const res = await req.json() as {
            data: {
                list: {
                    uuid: string,
                    subject: string,
                    fromAddress: string,
                    timestamp: number
                }[] | null
            }
        };

        const returnableMail: Mail[] = (res.data.list || []).map((email) => ({
            id: email.uuid,
            from: email.fromAddress,
            to: address,
            subject: email.subject,
            body: this.bodies[email.uuid] || '',
            date: email.timestamp
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://tempmail100.com/emails/content/${e.id}`, {
                headers: { 'Authorization': this.$token }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { content: string } };
                e.body = bodyRes.data.content;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}