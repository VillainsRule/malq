import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class tempmailmmo$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $sid = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmailmmo.com/ajax.php?f=get_domains', {
            headers: { 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' }
        });

        const res = await req.json() as { domains: string[] };
        return res.domains;
    }

    async createInbox(address: string): Promise<void> {
        const mailReq = await fish('https://tempmailmmo.com/ajax.php?f=get_email_address', {
            method: 'POST',
            body: 'f=get_email_address&lang=vi',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' }
        });

        const mailRes = await mailReq.json() as { email_addr: string, sid_token: string };

        const [user, domain] = address.split('@');

        await fish('https://tempmailmmo.com/ajax.php?f=set_email_user', {
            method: 'POST',
            body: `sid_token=${mailRes.sid_token}&email_user=${user}&lang=vi&email_domain=${domain}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' }
        });

        this.$sid = mailRes.sid_token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://tempmailmmo.com/ajax.php?f=get_email_list', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' },
            body: `f=get_email_list&offset=0&sid_token=${this.$sid}`
        });

        const res = await req.json() as {
            list: {
                mail_id: string,
                mail_from: string,
                mail_subject: string,
                mail_timestamp: string
            }[]
        }

        const returnableMail: Mail[] = res.list.filter(e => !e.mail_subject.endsWith('TempMail MMO')).map((email) => ({
            id: email.mail_id,
            from: email.mail_from,
            to: address,
            subject: email.mail_subject,
            body: this.bodies[email.mail_id] || '',
            date: Number(email.mail_timestamp) * 1000
        }));

        const finalMail = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await fish('https://tempmailmmo.com/ajax.php?f=fetch_email', {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' },
                    body: `f = fetch_email & email_id=${e.id} & sid_token=${this.$sid}`
                });
                const bodyRes = await bodyReq.json() as { mail_body: string };
                e.body = bodyRes.mail_body;
                this.bodies[e.id] = bodyRes.mail_body;
            }

            return e;
        }));

        return finalMail;
    }
}