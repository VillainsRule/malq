import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

export default class cs$email extends Provider {
    bodies: Record<string, string> = {};

    $user = '';
    $cookie = '';

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://cs.email');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        const randomDomain = matchedDomains[Math.floor(Math.random() * matchedDomains.length)];
        const domain = randomDomain.match(/<option value="(.*?)">/)![1];

        const name = res.match(/email_addr: '(.*?)@/)![1] || getRandomName();

        this.$user = name;
        this.address = `${name}@${domain}`;
        this.$cookie = `PHPSESSID=${req.headers.get('set-cookie')!.split(';')[0].split('=')[1]}`;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://cs.email/ajax.php?f=get_email_list&offset=0&site=cs.email&in=${this.$user}&_=${Date.now}`, {
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
            to: this.address,
            subject: mail.mail_subject,
            body: this.bodies[mail.mail_id] || '',
            date: parseInt(mail.mail_timestamp) * 1000
        })).filter(e => e.from !== 'no-reply@guerrillamail.com');

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://cs.email/ajax.php?f=fetch_email&email_id=mr_${e.id}&site=cs.email&in=${this.$user}&_=${Date.now()}`, {
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