// is slow, usually fails resend check

import { ObjectDomainCache } from '@/util/domainCache';
import Provider, { type Mail } from '../Provider';

const domainCache = new ObjectDomainCache();

export default class temp_mail$fyi extends Provider {
    bodies: Record<string, string> = {};

    $csrf: string = '';
    $cookie: string = '';

    async getAddress(): Promise<string> {
        const csrfReq = await this.fetch('https://temp-mail.fyi/');
        const csrfRes = await csrfReq.text();

        const csrfToken = csrfRes.match(/id="csrfToken" value="(.*?)"/)?.[1]!;
        this.$csrf = csrfToken;

        const phpSessId = csrfReq.headers.get('set-cookie')?.split(';')[0].split('=')[1];
        this.$cookie = `PHPSESSID=${phpSessId}`;

        if (!domainCache.hasItems()) {
            const req = await this.fetch('https://temp-mail.fyi/api/get_domains.php', {
                headers: { 'x-csrf-token': csrfToken, cookie: this.$cookie }
            });
            // id is actually a NUMBER, but for typing reasons, we'll declare it as a string
            const res = await req.json() as { domains: { id: string, domain: string }[] };
            domainCache.set(res.domains);
        }

        const domain = domainCache.pull();

        const generateReq = await this.fetch('https://temp-mail.fyi/api/generate_email.php', {
            method: 'POST',
            body: JSON.stringify({ domain_id: domain.id }),
            headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken, cookie: this.$cookie }
        });

        const generateRes = await generateReq.json() as { email_address: string };

        this.address = generateRes.email_address;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://temp-mail.fyi/api/get_emails.php', {
            method: 'POST',
            body: JSON.stringify({ email_address: this.address }),
            headers: { 'content-type': 'application/json', 'x-csrf-token': this.$csrf, cookie: this.$cookie }
        });

        const res = await req.json() as {
            emails: {
                sender_email: string,
                subject: string,
                body_text: string,
                body_html: string,
                received_at: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            from: email.sender_email,
            to: this.address,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: this.toEST(new Date(email.received_at).getTime(), 0)
        }));

        return returnableMail;
    }
}