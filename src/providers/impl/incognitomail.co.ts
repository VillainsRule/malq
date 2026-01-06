import crypto from 'node:crypto';

const encode = async (e: string) => {
    let t = new TextEncoder;
    let o = '6Cf1PDvSe{t2d6H2N;SCf34tRQOfoinO'.split('').map(e => String.fromCharCode(e.charCodeAt(0) - 2)).join('')
    let n = crypto.createHmac('sha256', o);
    let i = t.encode(e);
    let r = n.update(i).digest();
    return Array.from(new Uint8Array(r)).map(e => e.toString(16).padStart(2, '0')).join('')
}

import Provider, { type Mail } from '../Provider';

export default class IncogNitoMail$co extends Provider {
    $mailToken: string | null = null;

    async getAddress(): Promise<string> {
        const payload: any = { ts: Date.now(), domain: '' };
        payload.key = await encode(JSON.stringify(payload));

        const req = await this.fetch('https://api.incognitomail.co/inbox/v2/create', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://incognitomail.co/'
            }
        });
        const res = await req.json();

        this.address = res.id;
        this.$mailToken = res.token;

        return res.id;
    }

    async getMail(): Promise<Mail[]> {
        const payload: any = { inboxId: this.address, inboxToken: this.$mailToken, ts: Date.now() };
        payload.key = await encode(JSON.stringify(payload));

        const req = await this.fetch('https://api.incognitomail.co/inbox/v1/list', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://incognitomail.co/'
            }
        });
        const res = await req.json();

        const returnableMail: Mail[] = res.items.map((email: any) => ({
            from: email.sender.email,
            to: this.address!,
            subject: email.subject,
            body: email.messageURL,
            date: new Date(email.date).getTime()
        }));

        for (const e of returnableMail) {
            const encoded = this.encode(e);

            if (!this.knownMailSignatures.has(encoded)) {
                this.knownMailSignatures.add(encoded);

                const bodyReq = await this.fetch(e.body);
                const bodyRes = await bodyReq.text();

                try {
                    const parsed = JSON.parse(bodyRes);
                    e.body = parsed.text || parsed.html || parsed.textAsHtml;
                } catch (e) {
                    console.error(e);
                }

                if (!e.body) e.body = bodyRes;

                this.mail.push(e);
            }
        }

        return this.mail;
    }
}