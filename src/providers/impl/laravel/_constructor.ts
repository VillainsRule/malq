import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class laravelCommons implements ProviderImpl {
    domain = '';
    messageEndpoint = 'get_messages';
    domainPage = '';
    customLaravelCookie = '';
    isFormData = false;
    utcOffset = 0;
    ignoredEmails: string[] = [];

    $csrfToken = '';

    $xsrfCookie = '';
    $sessionCookie = '';
    $localeCookie = '';
    $emailCookie = '';

    async getDomains(): Promise<string[]> {
        const req = await fish(`https://${this.domain}${this.domainPage}`);
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish(`https://${this.domain}/en`, {
            headers: {
                'Referer': `https://${this.domain}/en`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            }
        });

        const res = await req.text();

        this.$csrfToken = res.match(/name="csrf-token" content="(.*?)"/)?.[1]!;
        this.updateCookies(req);

        const req2 = await fish(`https://${this.domain}/${this.messageEndpoint}`, {
            method: 'POST',
            headers: {
                'content-type': this.isFormData ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: `XSRF-TOKEN=${this.$xsrfCookie}; ${this.customLaravelCookie}=${this.$sessionCookie}; locale=${this.$localeCookie}`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            },
            body: this.isFormData ? `_token=${this.$csrfToken}&captcha=` : JSON.stringify({ _token: this.$csrfToken })
        });

        this.updateCookies(req2);

        const [name, domain] = address.split('@');

        const req3 = await fish(`https://${this.domain}/${this.isFormData ? 'create' : 'en/change'}`, {
            redirect: 'manual',
            method: 'POST',
            headers: {
                'content-type': this.isFormData ? 'application/x-www-form-urlencoded' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: `XSRF-TOKEN=${this.$xsrfCookie}; ${this.customLaravelCookie}=${this.$sessionCookie}; locale=${this.$localeCookie}; email=${this.$emailCookie}`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            },
            body: this.isFormData ? `_token=${this.$csrfToken}&name=${name}&domain=${domain}` : JSON.stringify({ _token: this.$csrfToken, name, domain })
        });

        this.updateCookies(req3);
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

    async getMail(address: string): Promise<Mail[]> {
        const mailCookie = `locale=${this.$localeCookie}; email=${this.$emailCookie}; ${this.customLaravelCookie}=${this.$sessionCookie}; XSRF-TOKEN=${this.$xsrfCookie}`;

        const req = await fish(`https://${this.domain}/${this.messageEndpoint}`, {
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

        const returnableMail: Mail[] = res.messages.filter(e => !this.ignoredEmails.includes(e.from_email)).map((email) => ({
            from: email.from_email,
            to: address,
            subject: email.subject,
            body: email.content,
            date: toEST(new Date(email.receivedAt).getTime(), this.utcOffset)
        }));

        return returnableMail;
    }
}