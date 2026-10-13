import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class temp$mail$lol implements ProviderImpl {
    async getDomains(): Promise<string[]> {
        const req = await fish('https://temp-mail-server.xm4n1d.easypanel.host/api/domains/website');
        const res = await req.json() as { domains: { domain: string, appOnly: boolean, status: string }[] };

        return res.domains.filter(d => !d.appOnly && d.status === 'online').map(d => d.domain);
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://temp-mail-server.xm4n1d.easypanel.host/api/web/get/${encodeURIComponent(address)}`);
        const res = await req.json() as {
            sender: string,
            receiver: string,
            subject: string,
            html_body: string,
            text_body: string,
            date: string
        }[];

        return res.map((email) => ({
            from: email.sender,
            to: email.receiver,
            subject: email.subject,
            body: email.html_body || email.text_body,
            date: new Date(email.date).getTime()
        }));
    }
}
