import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mail$premiumindigital$site implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://mail.premiumindigital.site/api/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        await fish('https://mail.premiumindigital.site/api/create-email', {
            method: 'POST',
            body: JSON.stringify({ username, domain }),
            headers: { 'content-type': 'application/json' }
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://mail.premiumindigital.site/api/mailbox/fetch?email=${address}`);
        const res = await req.json() as {
            messages: {
                from: string,
                to: string,
                subject: string,
                body: string,
                date: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.body,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}