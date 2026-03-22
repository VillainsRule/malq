import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

// never sends the full email subject to the client

export default class inboxes$com extends Provider {
    froms: Record<string, string> = {};
    subjects: Record<string, string> = {};
    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://inboxes.com/api/v2/domain');
        const res = await req.json() as { domains: { qdn: string }[] };

        const domain = res.domains[res.domains.length * Math.random() | 0].qdn;
        const user = getRandomName();
        const email = `${user}@${domain}`;

        this.address = email;
        return email;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://inboxes.com/api/v2/inbox/${this.address}`);
        const res = await req.json() as {
            msgs: {
                uid: string,
                f: string, // partial from string
                s: string, // partial subject string
                cr: string, // the FULL datestamp
            }[]
        }

        const returnableMail: Mail[] = res.msgs.map((email) => ({
            id: email.uid,
            from: this.froms[email.uid] || email.f,
            to: this.address,
            subject: this.subjects[email.uid] || email.s,
            body: this.bodies[email.uid] || '',
            date: new Date(email.cr).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch(`https://inboxes.com/api/v2/message/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body: string, html_body: string };
                e.body = bodyRes.body || bodyRes.html_body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}