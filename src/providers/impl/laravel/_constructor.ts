import CookieJar from '@/util/CookieJar';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

export default class laravelCommons implements ProviderImpl {
    domain = '';
    messageEndpoint = 'get_messages';
    domainPage = '';
    utcOffset = 0;
    ignoredEmails: string[] = [];

    $jar = new CookieJar();
    $csrfToken = '';
    $isFormData = false;

    async getDomains(): Promise<string[]> {
        const req = await fish(`https://${this.domain}${this.domainPage}`);
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        let url = `https://${this.domain}/`;
        let res = '';

        for (let hop = 0; hop < 5; hop++) {
            const req = await fish(url, {
                redirect: 'manual',
                headers: { 'Referer': url, 'user-agent': userAgent, cookie: this.$jar.getCookie() }
            });

            this.$jar.addSetCookie(req.headers.getSetCookie());

            const location = req.headers.get('location');
            if (req.status >= 300 && req.status < 400 && location) {
                url = new URL(location, url).href;
                continue;
            }

            res = await req.text();
            break;
        }

        this.$isFormData = res.includes('url = "');
        this.$csrfToken = res.match(/name="csrf-token" content="(.*?)"/)?.[1]!;

        const req2 = await fish(`https://${this.domain}/${this.messageEndpoint}`, {
            method: 'POST',
            headers: {
                'content-type': this.$isFormData ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: this.$jar.getCookie(),
                'user-agent': userAgent,
            },
            body: this.$isFormData ? `_token=${this.$csrfToken}&captcha=` : JSON.stringify({ _token: this.$csrfToken })
        });

        this.$jar.addSetCookie(req2.headers.getSetCookie());

        const [name, domain] = address.split('@');

        const req3 = await fish(`https://${this.domain}/${this.$isFormData ? 'create' : 'change'}`, {
            redirect: 'manual',
            method: 'POST',
            headers: {
                'content-type': this.$isFormData ? 'application/x-www-form-urlencoded' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: this.$jar.getCookie(),
                'user-agent': userAgent,
            },
            body: this.$isFormData ? `_token=${this.$csrfToken}&name=${name}&domain=${domain}` : JSON.stringify({ _token: this.$csrfToken, name, domain })
        });

        this.$jar.addSetCookie(req3.headers.getSetCookie());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://${this.domain}/${this.messageEndpoint}`, {
            method: 'POST',
            headers: {
                'content-type': this.$isFormData ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: this.$jar.getCookie(),
                'user-agent': userAgent,
            },
            body: this.$isFormData ? `_token=${this.$csrfToken}&captcha=` : JSON.stringify({ _token: this.$csrfToken })
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

        this.$jar.addSetCookie(req.headers.getSetCookie());

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