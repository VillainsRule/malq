import Provider, { type Mail } from '../Provider';

export default class temp_mail$org extends Provider {
    $token = '';

    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://web2.temp-mail.org/mailbox', { method: 'POST' });
        const res = await req.json() as { mailbox: string, token: string };

        this.address = res.mailbox;
        this.$token = res.token;

        return res.mailbox;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://web2.temp-mail.org/messages', {
            headers: { 'Authorization': `Bearer ${this.$token}` }
        });

        const res = await req.json() as {
            messages: {
                _id: string,
                from: string,
                subject: string,
                receivedAt: number
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email._id,
            from: email.from,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email._id] || '',
            date: email.receivedAt * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://web2.temp-mail.org/messages/${e.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.$token}`
                }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { bodyHtml: string };
                e.body = bodyRes.bodyHtml;
                this.bodies[e.id!] = bodyRes.bodyHtml;
            });

            return e;
        }));

        return finalMail;
    }
}