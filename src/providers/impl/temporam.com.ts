import { getRandomName } from '@/util/names';

import Provider, { type Mail } from '../Provider';

export default class temporam$com extends Provider {
    async getAddress(): Promise<string> {
        const req = await this.fetch('https://temporam.com/api/email/domains', {
            headers: { 'Referer': 'https://temporam.com/' }
        });

        const res = await req.json() as { domain: string }[];
        const domain = res[res.length * Math.random() | 0].domain;

        this.address = `${getRandomName()}@${domain}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://temporam.com/api/email/messages?email=${encodeURIComponent(this.address)}`, {
            headers: { 'Referer': 'https://temporam.com/' }
        });

        const res = await req.json() as {
            id: number,
            from_email: string,
            to_email: string,
            subject: string,
            content: string,
            summary: string,
            created_at: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            from: email.from_email,
            to: email.to_email,
            subject: email.subject,
            body: email.content || email.summary,
            date: new Date(email.created_at).getTime()
        }));

        return returnableMail;
    }
}