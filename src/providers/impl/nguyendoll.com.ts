import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class nguyendoll$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://nguyendoll.com');
        const res = await req.text();

        const rawDomains = res.match(/"domain":"(.*?)"/g) || [];
        return rawDomains.map(e => e.match(/"domain":"(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://nguyendoll.com/api/get_mail.php?email=' + encodeURIComponent(address));
        const res = await req.json() as {
            data: {
                subject: string,
                from_field: string,
                date: string,
                html_content: string
            }[];
        }

        const returnableMail: Mail[] = res.data.map((email) => ({
            from: email.from_field,
            to: address,
            subject: email.subject,
            body: email.html_content,
            date: toEST(new Date(email.date).getTime(), 7)
        }));

        return returnableMail;
    }
}