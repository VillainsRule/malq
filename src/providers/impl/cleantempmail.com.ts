import Provider, { type Mail } from '../Provider';

export default class cleantempmail$com extends Provider {
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const mailReq = await this.fetch('https://cleantempmail.com/api/generate-email', {
            headers: { 'referer': 'https://cleantempmail.com/' }
        });

        const mailRes = await mailReq.json() as { data: { email: string } };

        this.address = mailRes.data.email;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://cleantempmail.com/api/emails?email=' + this.address, {
            headers: { 'referer': 'https://cleantempmail.com/' }
        });

        const res = await req.json() as {
            data: {
                emails: {
                    from_address: string,
                    email_address: string,
                    subject: string,
                    timestamp: number,
                    content: string,
                    html_content: string
                }[]
            }
        }

        const returnableMail: Mail[] = res.data.emails.map((email) => ({
            from: email.from_address,
            to: email.email_address,
            subject: email.subject,
            body: email.content || email.html_content,
            date: email.timestamp * 1000
        }));

        return returnableMail;
    }
}