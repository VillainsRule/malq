import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class usmail$my$id implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://usmail.my.id/api/public/rooms/master/domains');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        const req = await fetch('https://usmail.my.id/api/public/rooms/master/register-email', {
            method: 'POST',
            body: JSON.stringify({ email: address }),
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await req.json() as { success: boolean, message: string };
        if (!res.success) throw new Error(res.message);
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://usmail.my.id/api/emails/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            success: true,
            emails: {
                from: string,
                subject: string
                text: string,
                html: string,
                time: string
            }[]
        } | {
            success: false,
            error: string
        };

        if (!res.success) {
            if (res.error === 'Email tidak ditemukan' /* "Email not found" */) return [];
            else throw new Error('usmail.my.id: getMail: ' + res.error);
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.text || email.html,
            date: new Date(email.time).getTime()
        }));

        return returnableMail;
    }
}