import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class aaa53nhanmaizzzz$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const domainReq = await fish('http://aaa53nhanmaizzzz.com/api/get_domains');
        const domainRes = await domainReq.json() as { domains: string[] };

        return domainRes.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`http://aaa53nhanmaizzzz.com/api/get_messages?email=${encodeURIComponent(address)}`);

        const res = await req.json() as {
            messages: {
                from: string,
                to: string,
                subject: string,
                time: string,
                body_text: string,
                body_html: string
            }[]
        }

        const returnableMail: Mail[] = res.messages.map((email) => ({
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: toEST(new Date(email.time + `/${new Date().getFullYear()}`).getTime(), -3552)
        }));

        return returnableMail;
    }
}