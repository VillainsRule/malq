import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class cleantempmail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://cleantempmail.com/api/domains', {
            headers: { 'referer': 'https://cleantempmail.com/' }
        });

        const res = await req.json() as { data: { domains: string[] } };
        return res.data.domains;
    }

    async createInbox(address: string): Promise<void> {
        const [prefix, domain] = address.split('@');

        await fish('https://cleantempmail.com/api/generate-email', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'referer': 'https://cleantempmail.com/' },
            body: JSON.stringify({ prefix, domain })
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://cleantempmail.com/api/emails?email=' + address, {
            headers: { 'referer': 'https://cleantempmail.com/' }
        });

        const res = await req.json() as {
            data: {
                emails: {
                    from_address: string,
                    email_address: string,
                    subject: string,
                    timestamp: number,
                    content: string,
                    html_content: string
                }[]
            }
        }

        const returnableMail: Mail[] = res.data.emails.map((email) => ({
            from: email.from_address,
            to: email.email_address,
            subject: email.subject,
            body: email.content || email.html_content,
            date: email.timestamp * 1000
        }));

        return returnableMail;
    }
}