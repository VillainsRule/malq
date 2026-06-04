import Provider, { type Mail } from '../Provider';

export default class vip$215$im extends Provider {
    bodies: Record<string, string> = {};

    cookie = '';
    token = '';

    async getAddress(): Promise<string> {
        const cookieReq = await this.fetch('https://vip.215.im/');
        this.cookie = cookieReq.headers.getSetCookie().map(e => e.split(';')[0]).join('; ');

        const mailReq = await this.fetch('https://vip.215.im/api/temp-inbox', {
            method: 'POST',
            headers: { 'cookie': this.cookie, 'Referer': 'https://vip.215.im/' }
        });

        const mailRes = await mailReq.json() as { data: { address: string, token: string } };

        this.address = mailRes.data.address;
        this.token = mailRes.data.token;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://vip.215.im/v1/messages', {
            headers: { 'authorization': `Bearer ${this.token}`, 'cookie': this.cookie, 'Referer': 'https://vip.215.im/' }
        });

        const res = await req.json() as {
            data: {
                messages: {
                    id: string,
                    from: { address: string },
                    subject: string,
                    createdAt: string
                }[]
            }
        }

        const returnableMail: Mail[] = res.data.messages.map((email) => ({
            id: email.id,
            from: email.from.address,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.createdAt).getTime()
        }));

        const finalMail = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await this.fetch(`https://vip.215.im/v1/messages/${e.id}`, {
                    headers: { 'authorization': `Bearer ${this.token}`, 'cookie': this.cookie, 'Referer': 'https://vip.215.im/' }
                });
                const bodyRes = await bodyReq.json() as { data: { html: string[] } };
                e.body = bodyRes.data.html.join('\n');
                this.bodies[e.id!] = e.body;
            }

            return e;
        }));

        return finalMail;
    }
}