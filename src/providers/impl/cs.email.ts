import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class cs$email implements ProviderImpl {
    bodies: Record<string, string> = {};

    $user = '';
    $cookie = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://cs.email');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://cs.email');

        this.$cookie = req.headers.get('set-cookie')!.split(';')[0];

        await fish('https://cs.email/ajax.php?f=set_email_user', {
            method: 'POST',
            body: `email_user=${address.split('@')[0]}&lang=en&site=cs.email&in=+Set+cancel`,
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: this.$cookie }
        });
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://cs.email/ajax.php?f=get_email_list&offset=0&site=cs.email&in=${this.$user}&_=${Date.now}`, {
            headers: { cookie: this.$cookie }
        });

        const rres = await req.text();
        const res = JSON.parse(rres) as {
            list: {
                mail_id: string,
                mail_from: string,
                mail_subject: string,
                mail_timestamp: string
            }[]
        };

        // console.log(res);

        const returnableMail: Mail[] = res.list.map((mail) => ({
            id: mail.mail_id,
            from: mail.mail_from,
            to: address,
            subject: mail.mail_subject,
            body: this.bodies[mail.mail_id] || '',
            date: parseInt(mail.mail_timestamp) * 1000
        })).filter(e => e.from !== 'no-reply@guerrillamail.com');

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://cs.email/ajax.php?f=fetch_email&email_id=mr_${e.id}&site=cs.email&in=${this.$user}&_=${Date.now()}`, {
                headers: { cookie: this.$cookie }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { mail_body: string };
                e.body = bodyRes.mail_body;
                this.bodies[e.id!] = bodyRes.mail_body;
            });

            return e;
        }));

        return finalMail;
    }
}