import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const API = 'https://tempmail-worker.mohammadsiam039.workers.dev';

export default class temporaries$email implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const homeReq = await fish('https://temporaries.email/');
        const homeRes = await homeReq.text();

        const scriptReq = await fish(`https://temporaries.email${homeRes.match(/src="(\/assets\/index-.*?\.js)"/)![1]}`);
        const scriptRes = await scriptReq.text();

        const list = scriptRes.match(/\[((?:"[a-z0-9.-]+",?)+)\],\w+="https:\/\/tempmail-worker/)![1];
        return list.split(',').map(d => d.replaceAll('"', ''));
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`${API}/api/messages?email=${encodeURIComponent(address)}`);
        const res = await req.json() as {
            id: string,
            to_address: string,
            from_address: string,
            subject: string,
            received_at: string
        }[];

        return await Promise.all(res.map(async (email) => {
            if (!this.bodies[email.id]) {
                const bodyReq = await fish(`${API}/api/messages/${email.id}?email=${encodeURIComponent(address)}`);
                const bodyRes = await bodyReq.json() as { text_content: string, html_content: string };

                this.bodies[email.id] = bodyRes.html_content || bodyRes.text_content;
            }

            return {
                id: email.id,
                from: email.from_address,
                to: email.to_address,
                subject: email.subject,
                body: this.bodies[email.id],
                date: new Date(email.received_at.replace(' ', 'T') + 'Z').getTime()
            };
        }));
    }
}
