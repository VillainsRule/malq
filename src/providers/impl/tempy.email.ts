import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempy$email implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        return ['tempy.email', 'getemail.digital', 'getemail.live', 'getemail.guru', 'email.tattoo', 'mailtemp.xyz', 'mailtemp.rest', 'tempy-email.com', 'tempemail.life', 'tempemail.guru', 'canvas-map.com', 'getemail.gay'];
    }

    async createInbox(address: string): Promise<void> {
        const [localPart, domain] = address.split('@');

        const req = await fish('https://tempy.email/api/inbox/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, local_part: localPart })
        });

        if (!req.ok) throw new Error('tempy.email: createInbox: ' + req.status + ' ' + await req.text());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://tempy.email/api/inbox/messages?address=${encodeURIComponent(address)}`);
        const res = await req.json() as {
            messages: {
                id: string,
                from: string,
                subject: string,
                body_text: string,
                received_at: string,
                direction: string
            }[]
        };

        return res.messages.filter(email => email.direction === 'inbound').map((email) => ({
            id: email.id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.body_text,
            date: new Date(email.received_at).getTime()
        }));
    }
}
