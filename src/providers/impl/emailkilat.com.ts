import wafFetch from '@/util/waf/fetch';

import type { Mail, ProviderImpl } from '../Provider';

export default class emailkilat$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const domainReq = await fetch('https://emailkilat.com/');
        const domainRes = await domainReq.text();

        const domainMatches = domainRes.match(/<option value="(.*?)"/g) || [];
        const uniqueMatches = [...new Set(domainMatches)].filter(e => e.includes('.'));
        return uniqueMatches.map((e) => e.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await wafFetch(`https://emailkilat.com/api.php?action=inbox&email=${encodeURIComponent(address)}`);

        const res = await req.json() as {
            messages: {
                from: string,
                subject: string,
                date: string,
                body: string,
                body_html: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.body || email.body_html,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}