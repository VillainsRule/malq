import Provider, { type Mail } from '../Provider';

// WAS SLIGHTLY MODIFIED
export default class ghostmail$one extends Provider {
    domain = 'ghostmail.one';
    customLaravelCookie = 'trashmail_session';

    $csrfToken: string | null = null;

    $xsrfCookie: string | null = null;
    $sessionCookie: string | null = null;
    $localeCookie: string | null = null;
    $emailCookie: string | null = null;

    async getAddress(): Promise<string> {
        const req = await this.fetch(`https://${this.domain}`, {
            headers: {
                'Referer': `https://${this.domain}/`
            }
        });
        const res = await req.text();

        this.$csrfToken = res.match(/name="csrf-token" content="(.*?)"/)?.[1]!;
        this.updateCookies(req);

        const initialCookie = `XSRF-TOKEN=${this.$xsrfCookie}; ${this.customLaravelCookie}=${this.$sessionCookie}; locale=${this.$localeCookie}`;

        const req2 = await this.fetch(`https://${this.domain}/messages`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-xsrf-token': this.$xsrfCookie || '', cookie: initialCookie },
            body: JSON.stringify({ _token: this.$csrfToken })
        });

        const res2 = await req2.json();

        this.updateCookies(req2);
        this.address = res2.mailbox;

        return res2.mailbox;
    }

    private updateCookies(res: Response) {
        res.headers.getSetCookie().forEach((cookie) => {
            const [name, value] = cookie.split(';')[0].trim().split('=');
            if (name === 'XSRF-TOKEN') this.$xsrfCookie = decodeURIComponent(value);
            if (name === this.customLaravelCookie) this.$sessionCookie = value;
            if (name === 'locale') this.$localeCookie = value;
            if (name === 'email') this.$emailCookie = decodeURIComponent(value);
        });
    }

    async getMail(): Promise<Mail[]> {
        const mailCookie = `locale=${this.$localeCookie}; email=${this.$emailCookie}; ${this.customLaravelCookie}=${this.$sessionCookie}; XSRF-TOKEN=${this.$xsrfCookie}`;

        const req = await this.fetch(`https://${this.domain}/messages`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-xsrf-token': this.$xsrfCookie || '', cookie: mailCookie },
            body: JSON.stringify({ _token: this.$csrfToken })
        });
        const res = await req.json() as {
            messages: {
                subject: string,
                from_email: string,
                content: string,
                receivedAt: string
            }[];
        };

        this.updateCookies(req);

        const returnableMail: Mail[] = res.messages.map((email) => ({
            from: email.from_email,
            to: this.address!,
            subject: email.subject,
            body: email.content,
            date: new Date(email.receivedAt).getTime()
        }));

        return returnableMail;
    }
}