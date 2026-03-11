import Provider, { type Mail } from '../Provider';

export default class mail$chatgpt$org$uk extends Provider {
    $token = '';
    $cookie = '';

    lastMail: Mail[] = [];

    async getAddress(): Promise<string> {
        const tokenReq = await this.fetch('https://mail.chatgpt.org.uk/');
        const tokenRes = await tokenReq.text();

        this.$token = tokenRes.match(/"token":"(.*?)"/)![1];
        this.$cookie = tokenReq.headers.get('set-cookie')!.split(';')[0].split('=')[1];

        const req = await this.fetch('https://mail.chatgpt.org.uk/api/generate-email', {
            headers: {
                'Cookie': `gm_sid=${this.$cookie}`,
                'Referer': 'https://mail.chatgpt.org.uk/',
                'X-Inbox-Token': this.$token
            }
        });

        const res = await req.json() as { data: { email: string }, auth: { token: string } };

        this.$cookie = req.headers.get('set-cookie')!.split(';')[0].split('=')[1];
        this.$token = res.auth.token;

        this.address = res.data.email;
        return res.data.email;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://mail.chatgpt.org.uk/api/emails?email=' + this.address, {
            headers: {
                'Cookie': `gm_sid=${this.$cookie}`,
                'Referer': 'https://mail.chatgpt.org.uk/',
                'X-Inbox-Token': this.$token
            }
        });

        const res = await req.json() as {
            data: {
                emails: {
                    id: string,
                    from_address: string,
                    email_address: string,
                    subject: string,
                    content: string,
                    html_content: string,
                    timestamp: number
                }[]
            },
            auth: {
                token: string
            }
        } | { error: string };

        this.$cookie = req.headers.get('set-cookie')?.split(';')[0].split('=')[1] || '';
        this.$token = ('auth' in res && res.auth.token) || '';

        if (('error' in res)) {
            if (res.error.includes('Too many requests')) return this.lastMail;
            else console.error('mail.chatgpt.org.uk error', res);
        }

        const returnableMail: Mail[] = ('data' in res) ? res.data.emails.map((email) => ({
            from: email.from_address,
            to: email.email_address,
            subject: email.subject,
            body: email.content || email.html_content,
            date: email.timestamp * 1000
        })) : [];

        this.lastMail = returnableMail;

        return returnableMail;
    }
}