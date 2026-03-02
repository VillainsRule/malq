import Provider, { type Mail } from '../Provider';

export default class mailtemp$us extends Provider {
    $token = '';

    froms: Record<string, string> = {};
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://mailtemp.us/api/create-session', {
            method: 'POST',
            body: '',
            headers: { 'content-type': 'application/x-www-form-urlencoded' }
        });

        const res = await req.json() as { email: string, token: string };

        this.address = res.email;
        this.$token = res.token;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://mailtemp.us/api/check-mail?token=${this.$token}&t=1772408842696&force=1`);
        const res = await req.json() as {
            messages: {
                id: number,
                sender_name: string, // CAN BE EMPTY
                subject: string,
                received_at: string
            }[];
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id.toString(),
            from: this.froms[email.id.toString()] || email.sender_name,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if ((!e.body || !e.from) && e.id) await this.fetch(`https://mailtemp.us/api/read-mail?token=${this.$token}&id=${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { message: { sender_email: string, body_text: string | null, body_html: string } };

                e.from = bodyRes.message.sender_email;
                e.body = bodyRes.message.body_text || bodyRes.message.body_html;

                this.froms[e.id!] = e.from;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}