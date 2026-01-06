import Provider, { type Mail } from '../Provider';

export default class mail$chatgpt$org$uk extends Provider {
    $mailToken: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://mail.chatgpt.org.uk/api/generate-email', {
            headers: {
                'Referer': 'https://mail.chatgpt.org.uk/'
            }
        });
        const res = await req.json();

        this.address = res.data.email;

        return res.data.email;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://mail.chatgpt.org.uk/api/emails?email=' + this.address, {
            headers: {
                'Referer': 'https://mail.chatgpt.org.uk/'
            }
        });
        const res = await req.json();

        const returnableMail: Mail[] = res.data.emails.map((email: any) => ({
            from: email.from_address,
            to: email.email_address,
            subject: email.subject,
            body: email.content || email.html_content,
            date: email.timestamp * 1000
        }));

        return returnableMail;
    }
}