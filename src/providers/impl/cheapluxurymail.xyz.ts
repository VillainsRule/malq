import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class cheapluxurymail$xyz implements ProviderImpl {
    bodies: Record<string, string> = {};

    $password = '';

    async getDomains(): Promise<string[]> {
        const domainReq = await fetch('https://cheapluxurymail.xyz/domains');
        const domainRes = await domainReq.json() as { data: { domains: string[] } };

        return domainRes.data.domains;
    }

    async createInbox(address: string): Promise<void> {
        this.$password = Math.random().toString(36).slice(2).toUpperCase() + Math.random().toString(36).slice(2).toLowerCase();

        await fish('https://cheapluxurymail.xyz/register', {
            method: 'POST',
            body: JSON.stringify({ email: address, password: this.$password }),
            headers: { 'content-type': 'application/json' }
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://cheapluxurymail.xyz/email/get', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: address, password: this.$password })
        });

        const res = await req.json() as {
            data: {
                emails: {
                    from_addr: string,
                    to_addr: string,
                    subject: string,
                    date: string,
                    body_text: string,
                    body_html: string
                }[]
            }
        }

        const returnableMail: Mail[] = res.data.emails.filter(e => e.from_addr !== 'welcome@cheapluxurymail.xyz').map((email) => ({
            from: email.from_addr,
            to: email.to_addr,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}