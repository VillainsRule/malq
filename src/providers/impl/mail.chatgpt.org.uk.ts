import { StringDomainCache } from '@/util/domainCache';
import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

const domainCache = new StringDomainCache();

export default class mail$chatgpt$org$uk extends Provider {
    bodies: Record<string, string> = {};

    $token = '';
    $cookie = '';

    async getAddress(): Promise<string> {
        if (!domainCache.hasItems()) {
            const domainReq = await this.fetch('https://mail.chatgpt.org.uk/api/domains/public');
            const domainRes = await domainReq.json() as { data: { domains: { domain_name: string, is_active: 1 | 0 }[] } };

            domainCache.set(domainRes.data.domains.filter(e => e.is_active).map(e => e.domain_name));
        }

        const address = `${getRandomName()}@${domainCache.pull()}`;

        const tokenReq = await this.fetch('https://mail.chatgpt.org.uk/api/inbox-token', {
            method: 'POST',
            body: JSON.stringify({ email: address }),
            headers: { 'content-type': 'application/json' }
        });

        const tokenRes = await tokenReq.json() as { auth: { token: string } };

        this.$token = tokenRes.auth.token;
        this.$cookie = tokenReq.headers.getSetCookie().map(e => e.split('; ')[0]).join('; ');

        this.address = address;
        return address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://mail.chatgpt.org.uk/api/emails?email=' + this.address, {
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
            auth: {
                token: string
            }
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
            if (!e.body && e.id) await this.fetch(`https://mail.chatgpt.org.uk/api/email/${e.id}?email=${encodeURIComponent(this.address)}&include_raw=0`, {
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