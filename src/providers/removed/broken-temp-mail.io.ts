import Provider, { type Mail } from '../Provider';

export default class temp_mail$io extends Provider {
    async getAddress(): Promise<string> {
        const req = await this.fetch('https://api.internal.temp-mail.io/api/v3/email/new', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ max_name_length: 10, min_name_length: 10 })
        });

        const res = await req.json() as { email: string, token: string };

        this.address = res.email;
        return res.email;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://api.internal.temp-mail.io/api/v3/email/${this.address}/messages`);
        const res = await req.json() as {
            id: string,
            from: string,
            to: string,
            subject: string,
            body_text: string,
            body_html: string,
            created_at: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            from: email.from.match(/<(.*?)>/)?.[1]!,
            to: email.to,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.created_at).getTime()
        }));

        return returnableMail;
    }
}