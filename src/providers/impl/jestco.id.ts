import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class jestco$id implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://jestco.id/api.php?action=get_public_config');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://jestco.id/api.php?to=${encodeURIComponent(address)}`);
        const res = await req.json() as {
            id: string,
            from: string,
            subject: string,
            date: string,
            body: string
        }[];

        return res.map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.body,
            date: new Date(email.date).getTime()
        }));
    }
}
