import Provider, { type Mail } from '../Provider';

import { getRandomName } from '../../util/names';

// some domains don't work (skipsend.io), so suspended for now

export default class mailscr$us extends Provider {
    $domain: string | null = null;
    $addressName: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://mailmask.cc/domains');
        const res = await req.json();

        const domain = res[res.length * Math.random() | 0];

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
        const req = await this.fetch(`https://mailmask.cc/inbox?user=${this.$addressName}&domain=${this.$domain}`);
        const res = await req.json();

        const returnableMail: Mail[] = res.map((email: any) => ({
            from: email.from_address.match(/<(.*?)>/)[1],
            to: this.address!,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.received_at).getTime()
        }));

        return returnableMail;
    }
}