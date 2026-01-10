import Provider, { type Mail } from '../Provider';

export default class mail$paicha$cloud extends Provider {
    $token: string | null = null;

    fullBodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://mail.paicha.cloud', { redirect: 'manual' });

        const redirectUrl = req.headers.get('location')!;
        this.address = redirectUrl.split('/')[2];

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://mail.paicha.cloud/api/${encodeURIComponent(this.address!)}`);

        const res = await req.json();

        const returnableMail: Mail[] = res.map((email: any) => ({
            id: email.id,
            from: email.from,
            to: this.address!,
            subject: email.subject,
            body: this.fullBodies[email.id] || '',
            date: new Date(email.created_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://mail.paicha.cloud/api/mailbox/${encodeURIComponent(this.address!)}/mail/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json();
                e.body = bodyRes.body || bodyRes.html_body;
                this.fullBodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}