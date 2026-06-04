import Provider, { type Mail } from '../Provider';

export default class tempmailmmo$com extends Provider {
    bodies: Record<string, string> = {};

    sid = '';

    async getAddress(): Promise<string> {
        const mailReq = await this.fetch('https://tempmailmmo.com/ajax.php?f=get_email_address', {
            method: 'POST',
            body: 'f=get_email_address&lang=vi',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' }
        });
        const mailRes = await mailReq.json() as { email_addr: string, sid_token: string };

        this.address = mailRes.email_addr;
        this.sid = mailRes.sid_token;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://tempmailmmo.com/ajax.php?f=get_email_list', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' },
            body: `f=get_email_list&offset=0&sid_token=${this.sid}`
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
            to: this.address,
            subject: email.mail_subject,
            body: this.bodies[email.mail_id] || '',
            date: Number(email.mail_timestamp) * 1000
        }));

        const finalMail = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await this.fetch('https://tempmailmmo.com/ajax.php?f=fetch_email', {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', 'x-tempmail-client': 'web' },
                    body: `f=fetch_email&email_id=${e.id}&sid_token=${this.sid}`
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