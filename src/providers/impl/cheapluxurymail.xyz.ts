import Provider, { type Mail } from '../Provider';

export default class cheapluxurymail$xyz extends Provider {
    bodies: Record<string, string> = {};

    password = '';

    async getAddress(): Promise<string> {
        const mailReq = await this.fetch('https://cheapluxurymail.xyz/random_email');
        const mailRes = await mailReq.json() as { data: { email: string, password: string } };

        this.address = mailRes.data.email;
        this.password = mailRes.data.password;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://cheapluxurymail.xyz/email/get', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: this.address,
                password: this.password
            })
        });

        const res = await req.json() as {
            data: {
                emails: {
                    from_addr: string,
                    to_addr: string,
                    subject: string,
                    date: string,
                    body_text: string,
                    body_html: string
                }[]
            }
        }

        const returnableMail: Mail[] = res.data.emails.filter(e => e.from_addr !== 'welcome@cheapluxurymail.xyz').map((email) => ({
            from: email.from_addr,
            to: email.to_addr,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}