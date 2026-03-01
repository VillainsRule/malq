import crypto from 'node:crypto';

import Provider, { type Mail } from '../Provider';

const sha256 = (str: string) => crypto.createHash('sha256').update(str).digest('hex');

export default class tempmail$lol extends Provider {
    $mailToken = '';

    knownMailSignatures: Set<string> = new Set();

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://api.tempmail.lol/v2/inbox/create');
        const res = await req.json() as { address: string, token: string };

        if (!res.address || !res.token) console.log('tempmail.lol failed', res);

        this.address = res.address;
        this.$mailToken = res.token;

        return res.address;
    }

    async getMail(): Promise<Mail[]> {
        try {
            const req = await this.fetch('https://api.tempmail.lol/v2/inbox?token=' + this.$mailToken);
            const res = await req.json() as {
                emails: {
                    id: string,
                    from: string,
                    to: string,
                    subject: string,
                    body: string,
                    date: number
                }[]
            }

            const returnableMail: Mail[] = res.emails.map((email) => ({
                from: email.from,
                to: email.to,
                subject: email.subject,
                body: email.body,
                date: email.date
            }));

            returnableMail.forEach((e) => {
                const encoded = sha256(JSON.stringify(e));

                if (!this.knownMailSignatures.has(encoded)) {
                    this.knownMailSignatures.add(encoded);
                    this.mail.push(e);
                }
            });

            return this.mail;
        } catch (e) {
            console.log('error fetching mail from tempmail.lol:', e);
            return this.mail;
        }
    }
}