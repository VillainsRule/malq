import CookieJar from '@/util/CookieJar';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

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
        const req = await fish(`https://${this.domain}/en`, {
            headers: {
                'Referer': `https://${this.domain}/en`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            }
        });

        const res = await req.text();

        this.$isFormData = res.includes('url = "');
        this.$csrfToken = res.match(/name="csrf-token" content="(.*?)"/)?.[1]!;
        this.$jar.addSetCookie(req.headers.getSetCookie());

        const req2 = await fish(`https://${this.domain}/${this.messageEndpoint}`, {
            method: 'POST',
            headers: {
                'content-type': this.$isFormData ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: this.$jar.getCookie(),
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            },
            body: this.$isFormData ? `_token=${this.$csrfToken}&captcha=` : JSON.stringify({ _token: this.$csrfToken })
        });

        this.$jar.addSetCookie(req2.headers.getSetCookie());

        const [name, domain] = address.split('@');

        const req3 = await fish(`https://${this.domain}/${this.$isFormData ? 'create' : 'en/change'}`, {
            redirect: 'manual',
            method: 'POST',
            headers: {
                'content-type': this.$isFormData ? 'application/x-www-form-urlencoded' : 'application/json',
                'x-xsrf-token': this.$csrfToken || '',
                cookie: this.$jar.getCookie(),
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
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
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
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