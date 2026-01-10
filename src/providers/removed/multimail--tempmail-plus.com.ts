import Provider, { type Mail } from '../Provider';

// copies w/ same design:
// - 1sec-mail.com
// - tempmail44.com

export default class tempmailplus$com extends Provider {
    $csrfToken: string | null = null;

    $xsrfCookie: string | null = null;
    $sessionCookie: string | null = null;
    $localeCookie: string | null = null;
    $emailCookie: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://tempmail-plus.com', {
            headers: {
                'Referer': 'https://tempmail-plus.com/'
            }
        });
        const res = await req.text();

        this.$csrfToken = res.match(/name="csrf-token" content="(.*?)"/)?.[1]!;

        const cookies = req.headers.get('set-cookie') || '';
        cookies.split(';').forEach((cookie) => {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN') this.$xsrfCookie = value;
            if (name === 'temp_mail_plus_session') this.$sessionCookie = value;
            if (name === 'locale') this.$localeCookie = value;
        });

        const initialCookie = `XSRF-TOKEN=${this.$xsrfCookie}; temp_mail_plus_session=${this.$sessionCookie}; locale=${this.$localeCookie}`;

        const req2 = await this.fetch('https://tempmail-plus.com/get_messages', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-xsrf-token': this.$xsrfCookie || '', cookie: initialCookie },
            body: JSON.stringify({ _token: this.$csrfToken })
        });
        const res2 = await req2.json();

        const cookies2 = req2.headers.get('set-cookie') || '';
        cookies2.split(';').forEach((cookie) => {
            const [name, value] = cookie.trim().split('=');
            if (name === 'email') this.$emailCookie = value;
            if (name === 'temp_mail_plus_session') this.$sessionCookie = value;
            if (name === 'XSRF-TOKEN') this.$xsrfCookie = value;
        });

        this.address = res2.mailbox;

        return res2.mailbox;
    }

    async getMail(): Promise<Mail[]> {
        const mailCookie = `locale=${this.$localeCookie}; email=${this.$emailCookie}; temp_mail_plus_session=${this.$sessionCookie}; XSRF-TOKEN=${this.$xsrfCookie}`;

        const req = await this.fetch(`https://tempmail-plus.com/get_messages`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-xsrf-token': this.$xsrfCookie || '', cookie: mailCookie },
            body: JSON.stringify({ _token: this.$csrfToken })
        });
        const res = await req.json();

        const returnableMail: Mail[] = res.messages.map((email: any) => ({
            from: email.from_email,
            to: email.to_email,
            subject: email.subject,
            body: email.content || email.summary,
            date: new Date(email.created_at).getTime()
        }));

        return returnableMail;
    }
}