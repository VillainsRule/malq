import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

// never sends the full email subject to the client

export default class inboxes$com implements ProviderImpl {
    froms: Record<string, string> = {};
    subjects: Record<string, string> = {};
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://inboxes.com/api/v2/domain');
        const res = await req.json() as { domains: { qdn: string }[] };

        return res.domains.map(e => e.qdn);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://inboxes.com/api/v2/inbox/${address}`);
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
            to: address,
            subject: this.subjects[email.uid] || email.s,
            body: this.bodies[email.uid] || '',
            date: new Date(email.cr).getTime()
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`https://inboxes.com/api/v2/message/${e.id}`).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { body: string, html_body: string };
                e.body = bodyRes.body || bodyRes.html_body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail;
    }
}