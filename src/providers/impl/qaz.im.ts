import Provider, { type Mail } from '../Provider';

export default class qaz$im extends Provider {
    $cookie = '';

    async getAddress(): Promise<string> {
        const cookieReq = await this.fetch('https://qaz.im');
        this.$cookie = cookieReq.headers.getSetCookie()[0].split(';')[0];

        const req = await this.fetch('https://qaz.im/api-mail/public/?_=' + Date.now(), { headers: { 'Cookie': this.$cookie, 'User-agent': 'Mozilla/5.0' } });
        const res = await req.json() as { mailbox: string };

        this.address = res.mailbox;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://qaz.im/api-mail/public/?_=' + Date.now(), { headers: { 'Cookie': this.$cookie, 'User-agent': 'Mozilla/5.0' } });

        const res = await req.json() as {
            messages: {
                subject: string,
                from_email: string,
                receivedAt: string,
                content: string
            }[]
        }

        const returnableMail: Mail[] = res.messages.map((email) => ({
            from: email.from_email,
            to: this.address,
            subject: email.subject,
            body: email.content,
            date: this.toEST(new Date(email.receivedAt).getTime(), 0)
        }));

        return returnableMail;
    }
}