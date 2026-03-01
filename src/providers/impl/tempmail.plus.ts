import { getRandomName } from '../../util/names';
import Provider, { type Mail } from '../Provider';

export default class tempmail$plus extends Provider {
    fullBodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://tempmail.plus/');
        const res = await req.text();

        const domainMatches = res.match(/"dropdown-item">(.*?)</g) || [];
        const randomDomain = domainMatches[Math.floor(Math.random() * domainMatches.length)];
        const domain = randomDomain.match(/"dropdown-item">(.*?)</)![1];

        const email = `${getRandomName()}@${domain}`;

        this.address = email;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://tempmail.plus/api/mails?email=${encodeURIComponent(this.address)}&limit=100`);
        const res = await req.json() as {
            mail_list: {
                mail_id: number,
                from_mail: string,
                subject: string,
                time: string
            }[]
        }

        const returnableMail: Mail[] = res.mail_list.map((email) => ({
            id: email.mail_id.toString(),
            from: email.from_mail,
            to: this.address,
            subject: email.subject,
            body: this.fullBodies[email.mail_id] || '',
            date: new Date(email.time).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://tempmail.plus/api/mails/${e.id}?email=${encodeURIComponent(this.address)}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { text: string, html: string };
                e.body = bodyRes.text || bodyRes.html;
                this.fullBodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}