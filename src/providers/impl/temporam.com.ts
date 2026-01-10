import Provider, { type Mail } from '../Provider';

import { getRandomName } from '../../util/names';

export default class temporam$com extends Provider {
    async getAddress(): Promise<string> {
        const req = await this.fetch('https://temporam.com/api/email/domains', {
            headers: {
                'Referer': 'https://temporam.com/'
            }
        });
        const res = await req.json();

        const domain = res[res.length * Math.random() | 0].domain;

        const emailName = getRandomName();
        const randomNumbers = Math.floor(1000 + Math.random() * 9000);
        const addressName = `${emailName}${randomNumbers}`;
        const emailAddress = `${addressName}@${domain}`;

        this.address = emailAddress;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://temporam.com/api/email/messages?email=${encodeURIComponent(this.address!)}`, {
            headers: {
                'Referer': 'https://temporam.com/'
            }
        });
        const res = await req.json();

        const returnableMail: Mail[] = res.map((email: any) => ({
            from: email.from_email,
            to: email.to_email,
            subject: email.subject,
            body: email.content || email.summary,
            date: new Date(email.created_at).getTime()
        }));

        return returnableMail;
    }
}