import { parse } from 'node-html-parser';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class mockemail$com implements ProviderImpl {
    $viewUrl = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://mockemail.com/');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="([^"]*\.[^"]*)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const [alias, domain] = address.split('@');

        const req = await fish('https://mockemail.com/api/create-alias', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ alias, domain, duration: '240', mode: 'alias' })
        });

        const res = await req.json() as { success: boolean, viewUrl: string, error?: string };
        if (!res.success) throw new Error('mockemail.com: createInbox: ' + res.error);

        this.$viewUrl = res.viewUrl;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(this.$viewUrl);
        const res = await req.text();

        return parse(res).querySelectorAll('.messages-container .message-card').map((card) => ({
            id: card.querySelector('.headers-button')?.getAttribute('onclick')?.match(/'mobile-(.*?)'/)?.[1],
            from: card.querySelector('.message-meta')!.text.match(/From:\s*(\S+)/)![1],
            to: address,
            subject: card.querySelector('.message-subject')!.text.trim(),
            body: card.querySelector('.message-body')!.innerHTML.trim(),
            date: new Date(card.querySelector('.message-meta')!.text.match(/Received:\s*(.*)/)![1].trim()).getTime()
        }));
    }
}
