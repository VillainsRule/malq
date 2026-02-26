import Provider, { type Mail } from '../Provider';

export default class tempmail$io$vn extends Provider {
    fullBodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://tempmail.io.vn');
        const res = await req.text();

        const domains = res.match(/<option value="(.*?)">/g)?.map((option: any) => option.match(/<option value="(.*?)">/)![1]) || [];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];

        this.address = `${Math.random().toString(36).substring(2, 10)}@${randomDomain}`;

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://temp-mail.louisnguyen198x.workers.dev/emails/${encodeURIComponent(this.address!)}`);
        const res = await req.json() as {
            result: {
                id: string,
                from_address: string,
                to_address: string,
                subject: string,
                received_at: number
            }[]
        };

        const returnableMail: Mail[] = res.result.map((email) => ({
            id: email.id,
            from: email.from_address,
            to: email.to_address,
            subject: email.subject,
            body: this.fullBodies[email.id] || '',
            date: new Date(email.received_at).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://temp-mail.louisnguyen198x.workers.dev/inbox/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json();
                e.body = bodyRes.result.text_content || bodyRes.result.html_content;
                this.fullBodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}