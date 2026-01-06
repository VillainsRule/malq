import Provider, { type Mail } from '../Provider';

import { getRandomName } from '../../util/names';

export default class TinyHost$shop extends Provider {
    $domain: string | null = null;
    $addressName: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://tinyhost.shop/api/random-domains/?page=1&limit=1');
        const res = await req.json();

        const domain = res.domains[0];

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
        const req = await this.fetch(`https://tinyhost.shop/api/email/${this.$domain}/${this.$addressName}/?page=1&limit=50`);
        const res = await req.json();

        const returnableMail: Mail[] = res.emails.map((email: any) => ({
            from: email.sender,
            to: this.address!,
            subject: email.subject,
            body: email.body || email.html_body,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}