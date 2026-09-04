import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mail$chatgpt$org$uk implements ProviderImpl {
    bodies: Record<string, string> = {};

    $token = '';
    $cookie = '';

    async getDomains(): Promise<string[]> {
        const domainReq = await fish('https://mail.chatgpt.org.uk/api/domains/public');
        const domainRes = await domainReq.json() as { data: { domains: { domain_name: string, is_active: 1 | 0 }[] } };

        return domainRes.data.domains.filter(e => e.is_active).map(e => e.domain_name);
    }

    async createInbox(address: string): Promise<void> {
        const tokenReq = await fish('https://mail.chatgpt.org.uk/api/inbox-token', {
            method: 'POST',
            body: JSON.stringify({ email: address }),
            headers: { 'content-type': 'application/json' }
        });

        const tokenRes = await tokenReq.json() as { auth: { token: string } };

        this.$token = tokenRes.auth.token;
        this.$cookie = tokenReq.headers.getSetCookie().map(e => e.split('; ')[0]).join('; ');
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://mail.chatgpt.org.uk/api/emails?email=' + address, {
            headers: {
                'Cookie': this.$cookie,
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
                    timestamp: number
                }[]
            },
            auth: { token: string }
        };

        const returnableMail: Mail[] = res.data.emails.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: email.email_address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.timestamp * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://mail.chatgpt.org.uk/api/email/${e.id}?email=${encodeURIComponent(address)}&include_raw=0`, {
                headers: { cookie: this.$cookie, 'x-inbox-token': this.$token }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { content: string, html_content: string } };
                e.body = bodyRes.data.content;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}