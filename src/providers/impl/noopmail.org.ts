import Provider, { type Mail } from '../Provider';

import { getRandomName } from '../../util/names';

export default class noopmail$org extends Provider {
    $domain: string | null = null;
    $addressName: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://noopmail.org/api/d');
        const res = await req.json();

        const domain = res[Math.floor(res.length * Math.random())];

        const emailName = getRandomName();
        const randomNumbers = Math.floor(1000 + Math.random() * 9000);
        const addressName = `${emailName}${randomNumbers}`;
        const emailAddress = `${addressName}@${domain}`;

        this.$domain = domain;
        this.$addressName = addressName;

        this.address = emailAddress;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://noopmail.org/api/c', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ d: this.$domain, e: this.$addressName })
        });
        const res = await req.json();

        const returnableMail: Mail[] = res.map((email: any) => ({
            from: email.from.match(/<(.*?)>/)[1],
            to: email.to,
            subject: email.subject,
            body: email.text,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}