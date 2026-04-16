import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

// some domains don't work (skipsend.io), so suspended for now

export default class maskmail$cc extends Provider {
    $domain = '';
    $email = '';

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://mailmask.cc/domains');
        const res = await req.json() as string[];

        this.$domain = res[res.length * Math.random() | 0];
        this.$email = getRandomName();

        this.address = `${this.$email}@${this.$domain}`;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://mailmask.cc/inbox?user=${this.$email}&domain=${this.$domain}`);
        const res = await req.json() as {
            from_address: string,
            subject: string,
            body_text: string,
            body_html: string,
            received_at: string
         }[];

        const returnableMail: Mail[] = res.map((email) => ({
            from: email.from_address.match(/<(.*?)>/)?.[1]!,
            to: this.address,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.received_at).getTime()
        }));

        return returnableMail;
    }
}