import Provider, { type Mail } from '../Provider';

export default class tmailor$com extends Provider {
    $token = '';

    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://tmailor.com/api', {
            method: 'POST',
            body: JSON.stringify({ action: 'newemail', curentToken: '', fbToken: null }),
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await req.json() as { email: string; accesstoken: string };

        this.address = res.email;
        this.$token = res.accesstoken;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://tmailor.com/api', {
            method: 'POST',
            body: JSON.stringify({ action: 'listinbox', curentToken: this.$token, accesstoken: this.$token, fbToken: null }),
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await req.json() as {
            data: Record<string, {
                id: string,
                subject: string,
                email_id: string,
                sender_email: string,
                receive_time: number
            }> | null
        };

        const messages = res.data ? Object.values(res.data) : [];

        const returnableMail: Mail[] = messages.map((email) => ({
            id: email.id,
            from: email.sender_email,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: email.receive_time * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fetch(`https://tmailor.com/api`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'read',
                    curentToken: this.$token,
                    accesstoken: this.$token,
                    bToken: null,
                    email_code: e.id,
                    email_token: res.data![e.id].email_id
                }),
                headers: { 'Content-Type': 'application/json' }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { body: string } };
                e.body = bodyRes.data.body;
                this.bodies[e.id!] = bodyRes.data.body;
            });

            return e;
        }));

        return finalMail;
    }
}