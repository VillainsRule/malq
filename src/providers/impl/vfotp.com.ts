import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' };

export default class vfotp$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://vfotp.com/', { headers });
        const res = await req.text();

        return [...res.matchAll(/<option[^>]*value="([^"]+)"/g)].map(m => m[1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://vfotp.com/api/inbox?email=${encodeURIComponent(address)}`, { headers });
        const res = await req.json() as {
            status: boolean,
            data?: {
                time: string,
                from: string,
                subject: string,
                text: string,
                html: string
            }[]
        };

        if (!res.status || !res.data) return [];

        return res.data.map((email) => ({
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.text || email.html,
            date: new Date(email.time.replace(' ', 'T') + 'Z').getTime()
        }));
    }
}
