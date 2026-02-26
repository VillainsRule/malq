import Provider, { type Mail } from '../../Provider';

import { getRandomName } from '../../../util/names';

export default class tempmail$guru extends Provider {
    domain = 'tempmail.guru';

    $token: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch(`https://${this.domain}/domains`);
        const res = await req.json();

        const domain = res.data[Math.floor(res.data.length * Math.random())];

        const emailName = getRandomName();
        const randomNumbers = Math.floor(1000 + Math.random() * 9000);
        const addressName = `${emailName}${randomNumbers}`;
        const emailAddress = `${addressName}${domain}`;

        const req2 = await this.fetch(`https://${this.domain}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: emailAddress, password: 'password' })
        });

        console.log('data', await req2.json())

        const tokenRes = await this.fetch(`https://${this.domain}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: emailAddress, password: 'password' })
        });

        const tokenJson = await tokenRes.json();

        this.address = emailAddress;
        this.$token = tokenJson.token;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        /*
        # 4. Fetch messages
curl https://api.mail.tm/messages \
-H "Authorization: Bearer TOKEN"
*/
        const req = await this.fetch(`https://${this.domain}/messages`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${this.$token}` }
        });
        const res = await req.json();

        console.log(res);

        const returnableMail: Mail[] = res.data.map((email: any) => ({
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.text,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}