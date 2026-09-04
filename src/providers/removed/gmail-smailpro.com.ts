import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class smailpro$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        return [];
    }

    async getPayload(url: string, params: [string, string][] = []) {
        const req = await fish('https://smailpro.com/app/payload?url=' + encodeURIComponent(url) + params.map(([a, b]) => `&${a}=${b}`).join(''));
        const res = await req.text();
        return res.trim();
    }

    async createInbox(address: string): Promise<void> {
        const payload = await this.getPayload('https://api.sonjj.com/v1/temp_email/create');
        const req = await fish('https://api.sonjj.com/v1/temp_email/create?payload=' + payload);
        const res = await req.json() as { email: string };

        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const payload = await this.getPayload('https://api.sonjj.com/v1/temp_email/inbox', [['email', address]]);
        const req = await fish('https://api.sonjj.com/v1/temp_email/inbox?payload=' + payload);
        const res = await req.json() as {
            messages: {
                mid: string,
                textTo: string,
                textFrom: string,
                textSubject: string,
                textDate: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.mid,
            from: email.textFrom,
            to: email.textTo,
            subject: email.textSubject,
            body: this.bodies[email.mid] || '',
            date: new Date(email.textDate).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const payload = await this.getPayload('https://api.sonjj.com/v1/temp_email/message', [['email', address], ['mid', e.id!]]);
                await fish('https://api.sonjj.com/v1/temp_email/message?payload=' + payload).then(async (bodyReq) => {
                    const bodyRes = await bodyReq.json() as { body: string };
                    e.body = bodyRes.body;
                    this.bodies[e.id!] = e.body;
                });
            }

            return e;
        }));

        return finalMail;
    }
}