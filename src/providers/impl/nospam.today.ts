import wafFetch from '@/util/waf/fetch';

import CookieJar from '@/util/CookieJar';

import type { Mail, ProviderImpl } from '../Provider';

const parseRSC = (html: string, key: string) => {
    const raw = html.match(new RegExp(`${key}\\\\":(\\[.*?\\]),\\\\"`, 's'))?.[1];
    return raw ? JSON.parse(JSON.parse(`"${raw}"`)) : [];
};

export default class nospam$today implements ProviderImpl {
    bodies: Record<string, string> = {};

    $jar = new CookieJar();

    async getDomains(): Promise<string[]> {
        const req = await wafFetch('https://nospam.today/');
        return parseRSC(req.text(), 'domains');
    }

    async createInbox(address: string): Promise<void> {
        const [username, domain] = address.split('@');

        const req = await wafFetch('https://nospam.today/api/mailbox/addresses', {
            method: 'POST',
            body: JSON.stringify({ action: 'create', kind: 'custom', username, domain }),
            headers: { 'content-type': 'application/json', 'accept': '*/*' }
        });

        this.$jar.addSetCookie(req.cookies);
        if (!req.ok) throw new Error(req.text());
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await wafFetch('https://nospam.today/mailbox', {
            headers: { cookie: this.$jar.getCookie() }
        });

        const messages = parseRSC(req.text(), 'messages') as {
            id: number,
            subject: string,
            senderEmail: string,
            receivedAt: string,
            bodyUrl: string
        }[];

        for (const msg of messages) {
            if (this.bodies[msg.id]) continue;

            const bodyReq = await wafFetch(`https://nospam.today${msg.bodyUrl}`, {
                headers: { cookie: this.$jar.getCookie() }
            });

            this.bodies[msg.id] = bodyReq.text();
        }

        return messages.map((msg) => ({
            from: msg.senderEmail,
            to: address,
            subject: msg.subject,
            body: this.bodies[msg.id],
            date: new Date(msg.receivedAt).getTime()
        }));
    }
}
