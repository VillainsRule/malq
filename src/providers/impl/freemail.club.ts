import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class freemail$club implements ProviderImpl {
    $jwt = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://freemail.club/open_api/settings');
        const res = await req.json() as { domainInfo: { name: string, tier: string }[] };

        return res.domainInfo.filter(d => d.tier === 'public').map(d => d.name);
    }

    async createInbox(address: string): Promise<void> {
        const [name, domain] = address.split('@');

        const req = await fish('https://freemail.club/api/new_address', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-requested-with': 'tempmail' },
            body: JSON.stringify({ name, domain, enableRandomSubdomain: false })
        });

        const res = await req.json() as { jwt?: string };
        if (!res.jwt) throw new Error('freemail.club: createInbox: ' + JSON.stringify(res));

        this.$jwt = res.jwt;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://freemail.club/api/parsed_mails?limit=20&offset=0', {
            headers: { authorization: `Bearer ${this.$jwt}`, 'x-requested-with': 'tempmail' }
        });

        const res = await req.json() as {
            results: {
                id: number,
                sender: string,
                subject: string,
                text: string,
                html: string,
                created_at: string
            }[]
        };

        return res.results.map((email) => ({
            id: String(email.id),
            from: email.sender,
            to: address,
            subject: email.subject,
            body: email.html || email.text,
            date: new Date(email.created_at.replace(' ', 'T') + 'Z').getTime()
        }));
    }
}
