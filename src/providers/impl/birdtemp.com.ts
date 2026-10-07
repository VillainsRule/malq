import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class birdtemp$com implements ProviderImpl {
    $token = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://birdtemp.com/');
        const res = await req.text();

        const select = res.match(/<select id="domain">([\s\S]*?)<\/select>/)![1];
        return [...select.matchAll(/<option value="(.*?)"/g)].map(m => m[1]);
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        const req = await fish('https://birdtemp.com/api/identity/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: 'USA', domain, username })
        });

        const res = await req.json() as { inboxToken?: string, error?: string };
        if (!res.inboxToken) throw new Error('birdtemp.com: createInbox: ' + (res.error || 'no token'));

        this.$token = res.inboxToken;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://birdtemp.com/api/inbox/${encodeURIComponent(address)}`, { headers: { 'x-inbox-token': this.$token } });
        const res = await req.json() as {
            _id: string,
            from: string,
            subject: string,
            body: string,
            html: string,
            createdAt: string
        }[];

        return res.map((email) => ({
            id: email._id,
            from: email.from,
            to: address,
            subject: email.subject,
            body: email.body || email.html,
            date: new Date(email.createdAt).getTime()
        }));
    }
}
