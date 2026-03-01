import Provider, { type Mail } from '../Provider';

export default class temp_mail$fyi extends Provider {
    bodies: Record<string, string> = {};

    $csrf: string = '';
    $cookie: string = '';

    async getAddress(): Promise<string> {
        const csrfReq = await this.fetch('https://temp-mail.fyi/');
        const csrfRes = await csrfReq.text();

        const csrfToken = csrfRes.match(/id="csrfToken" value="(.*?)"/)?.[1]!;
        this.$csrf = csrfToken;

        const phpSessId = csrfReq.headers.get('set-cookie')?.split(';')[0].split('=')[1];
        this.$cookie = `PHPSESSID=${phpSessId}`;

        const req = await this.fetch('https://temp-mail.fyi/api/get_domains.php', {
            headers: { 'x-csrf-token': csrfToken, cookie: this.$cookie }
        });

        const res = await req.json() as { domains: { id: number, domain: string }[] };
        const domain = res.domains[Math.floor(res.domains.length * Math.random())];

        const generateReq = await this.fetch('https://temp-mail.fyi/api/generate_email.php', {
            method: 'POST',
            body: JSON.stringify({ domain_id: domain.id }),
            headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken, cookie: this.$cookie }
        });

        const generateRes = await generateReq.json() as { email_address: string };

        this.address = generateRes.email_address;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://temp-mail.fyi/api/get_emails.php', {
            method: 'POST',
            body: JSON.stringify({ email_address: this.address }),
            headers: { 'content-type': 'application/json', 'x-csrf-token': this.$csrf, cookie: this.$cookie }
        });

        const res = await req.json() as {
            emails: {
                sender_email: string,
                subject: string,
                body_text: string,
                body_html: string,
                received_at: string
            }[]
        }

        const returnableMail: Mail[] = res.emails.map((email) => ({
            from: email.sender_email,
            to: this.address,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.received_at).getTime()
        }));

        return returnableMail;
    }
}