import { getRandomName } from '../../util/names';

import Provider, { type Mail } from '../Provider';

const BoomlifyDecryptor = new class {
    encryptionKey: { key: Uint8Array | null, keyString: string | null };

    constructor() {
        this.encryptionKey = {
            key: null,
            keyString: null
        };

        this.encryptionKey.keyString = '7a9b3c8d2e1f4g5h6i9j0k8l2m4n6o8p';
    }

    getTransportKeyRing() {
        const e = {
            hgjfh: 'rk4kA9fQm8v7W4d2TzX1Y',
            hgjfhg: 't2PzKd9sQw1Lm3XyVbN6R',
            hihji: 'bV7nL2cMzR6eJ8QaHp39T',
            guyg: 'oP6yT1xHaE9qD4KsLi82M',
            ojigh: 'mQ3wN8sRcK5tY2VhUe74Z',
            igug: 'Za1sX9qWe3rT7yUiPl56K',
            fyv: 'Hv4kM2nBq8sR1tJcLz93F',
            vy: 'Qs7nF3bLk1pV8xTdRm64G',
            gyvg: 'Nc5wZ1tQe9yH2rLaKs78D',
            gjbjb: 'Lf8pC6sWd3vX1qTuMz40S',
            zqplk: 'Tx9vK3dRm5nP2sLaQw71E',
            nmxas: 'Rj6mV4qTe8yN1bLcPw53C',
            rtuwq: 'Uw2nZ7sQa4tK9pLeMr86B',
            bchdk: 'Ky3pT5nWv7rQ1mLaZx68A',
            czmop: 'De9fR2sXq5tM1nLbVw84P',
            kqvtd: 'Gk1nP8rTe3yL6mQaZw59J',
            prxnl: 'Bn7qL4tWe2rP9mXsVd61H',
            svyud: 'Hp5mN2qTs8yR1lKaVw73U',
            tjbqw: 'Lm6tQ3nWp9rV2sXeYk45I',
            wmzlk: 'Vb8rP4tQe1mS7nKxZa62O',
            ydnfc: 'Cf2mH7vQp6tN9sLxRw83Y',
            aejru: 'Jq4nT6zWe5rM8vPaLs71X',
            bpvhs: 'Rd3pK9sTe2yN7mQwVb64Z',
            cltqg: 'Wu5sL2nQe8rT1yPaMx93C',
            pqlmn: 'Ep7mV1qRs6tN4xLbYz82D',
            vtycx: 'Ha9tQ2mWe5rP8nXsLv61F',
            wzufr: 'Nk8rS3pTe1yM6wQvZa75G',
            kdjsh: 'Zt4mP7nQw3rS6xLeVy82H',
            qwert: 'Oy6nR5mTe2pL9qXsWa34J',
            yuiop: 'Px1vK8tQe4mN7sLaRw53K',
            asdfg: 'Sm2nL9qTe5rV8pXaZw61M',
            hklop: 'Yd3pM6tQw7nR2sLeVk84N'
        };

        const t: Record<string, string> = {};
        for (const [s, a] of Object.entries(e)) {
            if (typeof a == 'string' && a.length > 0) t[s] = a;
        }

        if (Object.keys(t).length > 0) return t;
        else return null;
    }

    stringToBytes(e: string) {
        return new TextEncoder().encode(e);
    }

    bytesToString(e: Uint8Array) {
        return new TextDecoder().decode(e);
    }

    hexToBytes(e: string) {
        const t = new Uint8Array(e.length / 2);
        for (let s = 0; s < e.length; s += 2) {
            t[s / 2] = parseInt(e.substr(s, 2), 16);
        }
        return t;
    }

    decrypt(e: { encrypted: string }, t: string) {
        if (!this.encryptionKey.keyString) return e;

        try {
            if (typeof e == 'object' && e.encrypted) {
                const s = e.encrypted;
                let a = this.encryptionKey.keyString;
                if (t) {
                    const e = this.getTransportKeyRing();
                    if (e && Object.prototype.hasOwnProperty.call(e, t)) {
                        a = e[t];
                    }
                }
                const r = this.stringToBytes(a);
                const i = this.hexToBytes(s);
                let l = '';
                for (let e = 0; e < i.length; e++) {
                    l += String.fromCharCode(i[e] ^ r[e % r.length]);
                }
                return JSON.parse(l);
            }
            return e;
        } catch (s) {
            return e;
        }
    }
}();

export default class boomlify$com extends Provider {
    $token = '';
    $id = '';

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://v1.boomlify.com/guest/init', { method: 'POST' });
        const res = await req.json();
        const encKey = req.headers.get('x-enc-key-id')!;
        const decoded = BoomlifyDecryptor.decrypt(res, encKey);

        this.$token = decoded.token;

        const req2 = await this.fetch('https://v1.boomlify.com/domains', { headers: { 'Authorization': `Bearer ${this.$token}` } });
        const res2 = await req2.json() as { domains: { is_premium: boolean, id: string, domain: string }[] };

        const allowedDomains = res2.domains.filter((e) => !e.is_premium);
        const randomDomain = allowedDomains[allowedDomains.length * Math.random() | 0];

        const randomName = getRandomName();
        const email = `${randomName}@${randomDomain.domain}`;

        const req3 = await this.fetch('https://v1.boomlify.com/emails/create', {
            method: 'POST',
            body: JSON.stringify({ email, domainId: randomDomain.id }),
            headers: { 'Authorization': `Bearer ${this.$token}`, 'Content-Type': 'application/json' }
        });

        const res3 = await req3.json();
        const res3t = req3.headers.get('x-enc-key-id')!;
        const res3d = BoomlifyDecryptor.decrypt(res3, res3t);

        this.$id = res3d.id;
        this.address = email;

        return email;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://v1.boomlify.com/emails/${this.$id}/received?page=1&limit=100&skipCache=true`, {
            headers: { 'Authorization': `Bearer ${this.$token}`, 'Content-Type': 'application/json' }
        });

        const res = await req.json() as {
            data: {
                from_email: string,
                recipient: string,
                subject: string,
                body_html: string,
                body_text: string,
                received_at: string
            }[];
        };

        const returnableMail: Mail[] = res.data.map((email) => ({
            from: email.from_email,
            to: email.recipient,
            subject: email.subject,
            body: email.body_text || email.body_html,
            date: new Date(email.received_at).getTime()
        }));

        return returnableMail;
    }
}