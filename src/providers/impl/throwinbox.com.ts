import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class throwinbox$com implements ProviderImpl {
    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://throwinbox.com/api/domains');
        const res = await req.json() as { domain: string, is_active: boolean }[];

        return res.filter(d => d.is_active).map(d => d.domain);
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        const req = await fish(`https://throwinbox.com/api/inbox?username=${username}&domain=${domain}&duration_minutes=60`, { method: 'POST' });
        const res = await req.json() as { access_token: string };

        this.$token = res.access_token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://throwinbox.com/api/inbox/emails?email=${encodeURIComponent(address)}&token=${this.$token}`);
        const res = await req.json() as {
            id: number,
            sender: string,
            subject: string,
            body: string,
            html_body: string,
            received_at: string
        }[];

        return res.map((email) => ({
            id: String(email.id),
            from: email.sender,
            to: address,
            subject: email.subject,
            body: email.html_body || email.body,
            date: new Date(email.received_at + 'Z').getTime()
        }));
    }
}
