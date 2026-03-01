import parse from 'node-html-parser';
import WebSocket from 'ws';

import { getRandomName } from '../../../util/names';

import Provider, { type Mail } from '../../Provider';

export default class _24$email extends Provider {
    fullBodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://24.email/get-domains');
        const res = await req.json();

        const domain = res[Math.floor(Math.random() * res.length)].name;
        const user = getRandomName();

        this.address = `${user}@${domain}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const ws = new WebSocket(`wss://24.email/ws/emails?email=${encodeURIComponent(this.address)}`, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                'origin': 'https://24.email'
            }
        });

        return new Promise((resolve) => {
            let didResolve = false;

            ws.onopen = () => ws.send(JSON.stringify({ type: 'init' }));
            ws.onclose = () => (!didResolve && resolve([]));
            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data as string) as {
                    type: 'all',
                    emails: {
                        sender: string,
                        received_at: string,
                        subject: string,
                        body: string
                    }[];
                } | { type: 'ack' };

                if (data.type === 'all') {
                    const returnableMail: Mail[] = data.emails.map((email) => ({
                        id: email.body,
                        from: email.sender,
                        to: this.address,
                        subject: email.subject,
                        body: this.fullBodies[email.body] || '',
                        date: new Date(email.received_at).getTime()
                    }));

                    const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
                        if (!e.body && e.id) await this.fetch(`https://24.email${e.id}`).then(async (bodyReq) => {
                            const bodyRes = await bodyReq.text();
                            const bodyDOM = parse(bodyRes);

                            const bodySelected = bodyDOM.querySelector('body');
                            bodySelected?.querySelector('img[src*="awstrack.me"]')?.remove();

                            const body = bodySelected?.innerHTML.trim() || '';
                            e.body = body;
                            this.fullBodies[e.id!] = body;
                        });

                        return e;
                    }));

                    didResolve = true;
                    resolve(finalMail);
                    ws.close();
                } else if (data.type !== 'ack') ws.close();
            }
        });
    }
}