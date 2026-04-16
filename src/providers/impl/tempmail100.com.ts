import Provider, { type Mail } from '../Provider';

export default class tempmail100$com extends Provider {
    bodies: Record<string, string> = {};

    $token = '';

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://tempmail100.com/init', { method: 'POST' });
        const res = await req.json() as { data: { token: string } };

        this.$token = res.data.token;

        const addressReq = await this.fetch('https://tempmail100.com/web/generate', {
            method: 'POST',
            headers: { 'Authorization': this.$token }
        });
        const addressRes = await addressReq.json() as { data: { address: string } };

        this.address = addressRes.data.address;
        return addressRes.data.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://tempmail100.com/web/emails', {
            headers: { 'Authorization': this.$token }
        });
        const res = await req.json() as {
            data: {
                list: {
                    uuid: string,
                    subject: string,
                    fromAddress: string,
                    timestamp: number
                }[] | null
            }
        };

        const returnableMail: Mail[] = (res.data.list || []).map((email) => ({
            id: email.uuid,
            from: email.fromAddress,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.uuid] || '',
            date: email.timestamp
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://tempmail100.com/emails/content/${e.id}`, {
                headers: { 'Authorization': this.$token }
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { data: { content: string } };
                e.body = bodyRes.data.content;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}