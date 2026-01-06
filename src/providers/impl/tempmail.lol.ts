import Provider, { type Mail } from '../Provider';

export default class TempMail$lol extends Provider {
    $mailToken: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://api.tempmail.lol/v2/inbox/create');
        const res = await req.json();

        if (!res.address || !res.token) console.log(res);

        this.address = res.address;
        this.$mailToken = res.token;

        return res.address;
    }

    async getMail(): Promise<Mail[]> {
        try {
            const req = await this.fetch('https://api.tempmail.lol/v2/inbox?token=' + this.$mailToken);
            const res = await req.json();

            const returnableMail: Mail[] = res.emails.map((email: any) => ({
                from: email.from,
                to: email.to,
                subject: email.subject,
                body: email.body,
                date: email.date
            }));

            returnableMail.forEach((e) => {
                const encoded = this.encode(e);

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