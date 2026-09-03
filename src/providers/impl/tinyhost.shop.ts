import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tinyhost$shop implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://tinyhost.shop/api/all-domains/');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const [email, domain] = address.split('@');

        const req = await fish(`https://tinyhost.shop/api/email/${domain}/${email}/?page=1&limit=50`);
        const res = await req.json() as {
            emails: {
                id: string,
                sender: string,
                subject: string,
                body: string,
                html_body: string,
                date: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            from: email.sender,
            to: address,
            subject: email.subject,
            body: email.body || email.html_body,
            date: toEST(new Date(email.date).getTime(), 0)
        }));

        return returnableMail;
    }
}