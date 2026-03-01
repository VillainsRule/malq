import Provider, { type Mail } from '../../Provider';

export default class laravelCommons extends Provider {
    domain = '';
    messageEndpoint = 'get_messages';
    customLaravelCookie = '';
    hasAddress = false;
    isFormData = false;

    $csrfToken = '';

    $xsrfCookie = '';
    $sessionCookie = '';
    $localeCookie = '';
    $emailCookie = '';

    async getAddress(): Promise<string> {
        const req = await fetch(`https://${this.domain}/en`, {
            headers: {
                'Referer': `https://${this.domain}/en`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            }
        });
        const res = await req.text();

        this.$csrfToken = res.match(/name="csrf-token" content="(.*?)"/)?.[1]!;
        this.updateCookies(req);

        const mailCookie = `XSRF-TOKEN=${this.$xsrfCookie}; ${this.customLaravelCookie}=${this.$sessionCookie}; locale=${this.$localeCookie}`;

        const req2 = await fetch(`https://${this.domain}/${this.messageEndpoint}?${Date.now()}`, {
            method: 'POST',
            headers: {
                'content-type': this.isFormData ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: mailCookie,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            },
            body: this.isFormData ? `_token=${this.$csrfToken}&captcha=` : JSON.stringify({ _token: this.$csrfToken })
        });

        const res2 = await req2.json() as { mailbox: string };

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

        const req = await this.fetch(`https://${this.domain}/${this.messageEndpoint}`, {
            method: 'POST',
            headers: {
                'content-type': this.isFormData ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: mailCookie,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            },
            body: this.isFormData ? `_token=${this.$csrfToken}&captcha=` : JSON.stringify({ _token: this.$csrfToken })
        });
        const res = await req.json() as {
            messages: {
                subject: string,
                from_email: string,
                to: string,
                content: string,
                receivedAt: string
            }[];
        };

        this.updateCookies(req);

        const returnableMail: Mail[] = res.messages.map((email) => ({
            from: email.from_email,
            to: this.hasAddress ? email.to : this.address,
            subject: email.subject,
            body: email.content,
            date: new Date(email.receivedAt).getTime()
        }));

        return returnableMail;
    }
}