import Provider, { type Mail } from '../Provider';

export default class smailpro$com extends Provider {
    $mailToken: string | null = null;

    fullBodies: Record<string, string> = {};

    async getPayload(url: string, params: [string, string][] = []) {
        const req = await this.fetch('https://smailpro.com/app/payload?url=' + encodeURIComponent(url) + params.map(([a, b]) => `&${a}=${b}`).join(''));
        const res = await req.text();
        return res.trim();
    }

    async getAddress(): Promise<string> {
        const payload = await this.getPayload('https://api.sonjj.com/v1/temp_email/create');
        const req = await this.fetch('https://api.sonjj.com/v1/temp_email/create?payload=' + payload);
        const res = await req.json() as { email: string };

        this.address = res.email;
        return res.email;
    }

    async getMail(): Promise<Mail[]> {
        const payload = await this.getPayload('https://api.sonjj.com/v1/temp_email/inbox', [['email', this.address!]]);
        const req = await this.fetch('https://api.sonjj.com/v1/temp_email/inbox?payload=' + payload);
        const res = await req.json() as {
            messages: {
                mid: string,
                textTo: string,
                textFrom: string,
                textSubject: string,
                textDate: string
            }[]
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email.mid,
            from: email.textFrom,
            to: email.textTo,
            subject: email.textSubject,
            body: this.fullBodies[email.mid] || '',
            date: new Date(email.textDate).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const payload = await this.getPayload('https://api.sonjj.com/v1/temp_email/message', [['email', this.address!], ['mid', e.id!]]);
                await this.fetch('https://api.sonjj.com/v1/temp_email/message?payload=' + payload).then(async (bodyReq) => {
                    const bodyRes = await bodyReq.json();
                    e.body = bodyRes.body;
                    this.fullBodies[e.id!] = e.body;
                });
            }

            return e;
        }));

        return finalMail;
    }
}