import Provider, { type Mail } from '../Provider';

export default class _10minemail$com extends Provider {
    $token: string | null = null;

    bodyCache: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://web2.10minemail.com/mailbox', { method: 'POST' });
        const res = await req.json() as { mailbox: string, token: string };

        this.$token = res.token;
        this.address = res.mailbox;

        return res.mailbox;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://web2.10minemail.com/messages', {
            headers: {
                'Authorization': `Bearer ${this.$token}`
            }
        });
        const res = await req.json() as {
            mailbox: string;
            messages: {
                _id: string,
                receivedAt: number,
                from: string,
                subject: string
            }[];
        };

        const returnableMail: Mail[] = res.messages.map((email) => ({
            id: email._id,
            from: email.from,
            to: res.mailbox,
            subject: email.subject,
            body: this.bodyCache[email._id] || '',
            date: email.receivedAt * 1000
        }));

        const finalMail = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const bodyReq = await this.fetch(`https://web2.10minemail.com/messages/${e.id}`, {
                    headers: {
                        'Authorization': `Bearer ${this.$token}`
                    }
                });

                const bodyRes = await bodyReq.json() as { bodyHtml: string };

                e.body = bodyRes.bodyHtml;
                this.bodyCache[e.id!] = e.body;
            }

            return e;
        }));

        return finalMail;
    }
}