import crypto from 'node:crypto';

import Provider, { type Mail } from '../Provider';

const getSign = (input: string) => {
    const rand = Math.random().toString(36).substring(2, 15);
    const date = Date.now().toString();
    const hash = crypto.createHash('sha256').update(rand).digest('hex');
    const sigData = `${input}|${date}|${hash}`;
    const hmac = crypto.createHmac('sha256', 'EE7ECD69854932E49AAFA9ED03206BDA9C4368853E670586079936639DA37355');
    hmac.update(sigData);
    const sig = hmac.digest('hex');
    return {
        timestamp: date,
        nonce: rand,
        signature: sig
    };
};

export default class postbox$cfd extends Provider {
    $authToken = '';

    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const tokenSig = getSign('emailGeneration');
        const req = await this.fetch('https://mailapi.tempmailfa.st/api/v1/auth/token', {
            headers: {
                'X-Nonce': tokenSig.nonce,
                'X-Timestamp': tokenSig.timestamp,
                'X-Signature': tokenSig.signature
            }
        });

        const res = await req.text();
        this.$authToken = res;

        const emailSig = getSign('emailGeneration');
        const req2 = await this.fetch('https://mailapi.tempmailfa.st/api/v1/mailboxes/dynamic', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.$authToken}`,
                'Content-Type': 'application/json',
                'X-Nonce': emailSig.nonce,
                'X-Timestamp': emailSig.timestamp,
                'X-Signature': emailSig.signature
            },
            body: JSON.stringify({})
        });

        const res2 = await req2.json() as { address: string };

        this.address = res2.address;
        return res2.address;
    }

    async getMail(): Promise<Mail[]> {
        const getSig = getSign('emailGeneration');
        const req = await this.fetch(`https://mailapi.tempmailfa.st/api/v1/emails/inbox/${encodeURIComponent(this.address)}`, {
            headers: {
                'Authorization': `Bearer ${this.$authToken}`,
                'X-Nonce': getSig.nonce,
                'X-Timestamp': getSig.timestamp,
                'X-Signature': getSig.signature
            }
        });

        const res = await req.json() as {
            id: string,
            fromAddress: string,
            subject: string,
            receivedAt: number,
            inboxAddress: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            id: email.id,
            from: email.fromAddress,
            to: email.inboxAddress,
            subject: email.subject,
            body: this.bodies[email.id] || '',
            date: new Date(email.receivedAt).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) {
                const getBodySig = getSign('emailGeneration');

                await this.fetch(`https://mailapi.tempmailfa.st/api/v1/emails/${e.id}`, {
                    headers: {
                        'Authorization': `Bearer ${this.$authToken}`,
                        'X-Nonce': getBodySig.nonce,
                        'X-Timestamp': getBodySig.timestamp,
                        'X-Signature': getBodySig.signature
                    }
                }).then(async (bodyReq) => {
                    const bodyRes = await bodyReq.json() as { bodyText: string, bodyHtml: string };
                    e.body = bodyRes.bodyText || bodyRes.bodyHtml;
                    this.bodies[e.id!] = bodyRes.bodyText || bodyRes.bodyHtml;
                });
            }

            return e;
        }));

        return finalMail;
    }
}