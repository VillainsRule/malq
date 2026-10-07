import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class boomlify$com implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://v1.boomlify.com/domains/public');
        const res = await req.json() as { domain: string, is_premium: number, is_edu: number, is_active: number }[];

        return res.filter(d => d.is_active && !d.is_premium && !d.is_edu).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const domainReq = await fish('https://v1.boomlify.com/domains/public');
        const domains = await domainReq.json() as { id: string, domain: string }[];

        const domainId = domains.find(d => d.domain === address.split('@')[1])?.id;
        if (!domainId) throw new Error('boomlify.com: createInbox: unknown domain');

        const req = await fish('https://v1.boomlify.com/emails/public/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: address, domainId })
        });

        const res = await req.json() as { error?: string };
        if (res.error) throw new Error('boomlify.com: createInbox: ' + res.error);
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://v1.boomlify.com/emails/public/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            id: string,
            from_email: string,
            subject: string,
            body_html: string,
            body_text: string,
            received_at: string
        }[];

        return res.map((email) => ({
            id: email.id,
            from: email.from_email,
            to: address,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.received_at).getTime()
        }));
    }
}
