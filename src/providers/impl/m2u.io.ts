import Provider, { type Mail } from '../Provider';

export default class m2u$io extends Provider {
    bodies: Record<string, string> = {};

    token = '';
    viewToken = '';

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://api.m2u.io/v1/mailboxes/auto', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'Content-Type': 'application/json' }
        });
        const res = await req.json() as { mailbox: { token: string, view_token: string, local_part: string, domain: string } };

        this.token = res.mailbox.token;
        this.viewToken = res.mailbox.view_token;

        const email = `${res.mailbox.local_part}@${res.mailbox.domain}`;

        this.address = email;
        return email;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://api.m2u.io/v1/mailboxes/${this.token}/messages?view=${this.viewToken}`);
        const res = await req.json() as {
            messages: {
                id: string,
                from_addr: string,
                subject: string,
                received_at: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.id,
            from: email.from_addr,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://api.m2u.io/v1/mailboxes/${this.token}/messages/${e.id}?view=${this.viewToken}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { message: { text_body: string | null, html_body: string } };
                e.body = bodyRes.message.text_body || bodyRes.message.html_body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}