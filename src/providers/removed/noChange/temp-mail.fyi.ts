// is slow, usually fails resend check

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

const domainToID: Record<string, number> = {};

export default class temp_mail$fyi implements ProviderImpl {
    bodies: Record<string, string> = {};

    $csrf: string = '';
    $cookie: string = '';

    async getDomains(): Promise<string[]> {
        const csrfReq = await fish('https://temp-mail.fyi/');
        const csrfRes = await csrfReq.text();

        const csrfToken = csrfRes.match(/id="csrfToken" value="(.*?)"/)?.[1]!;
        const phpSessId = csrfReq.headers.getSetCookie()[0].split(';')[0];

        const req = await fish('https://temp-mail.fyi/api/get_domains.php', {
            headers: { 'x-csrf-token': csrfToken, cookie: phpSessId }
        });

        const res = await req.json() as { domains: { id: number, domain_name: string }[] };
        res.domains.forEach((d) => domainToID[d.domain_name] = d.id);
        return res.domains.map(e => e.domain_name);
    }

    async createInbox(address: string): Promise<void> {
        const csrfReq = await fish('https://temp-mail.fyi/');
        const csrfRes = await csrfReq.text();

        this.$csrf = csrfRes.match(/id="csrfToken" value="(.*?)"/)?.[1]!;
        this.$cookie = csrfReq.headers.getSetCookie()[0].split(';')[0];

        const [, domain] = address.split('@');

        const generateReq = await fish('https://temp-mail.fyi/api/generate_email.php', {
            method: 'POST',
            body: JSON.stringify({ domain_id: domainToID[domain] }),
            headers: { 'content-type': 'application/json', 'x-csrf-token': this.$csrf, cookie: this.$cookie }
        });

        const generateRes = await generateReq.json() as { email_address: string };

        address = generateRes.email_address;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://temp-mail.fyi/api/get_emails.php', {
            method: 'POST',
            body: JSON.stringify({ email_address: address }),
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
            to: address,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: toEST(new Date(email.received_at).getTime(), 0)
        }));

        return returnableMail;
    }
}