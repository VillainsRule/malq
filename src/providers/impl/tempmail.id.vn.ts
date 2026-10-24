import { parse } from 'node-html-parser';

import LWUpdate from '@/util/livewire/LWUpdate';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const unitMs: Record<string, number> = { 'giây': 1000, 'phút': 60000, 'giờ': 3600000, 'ngày': 86400000, 'tuần': 604800000, 'tháng': 2592000000 };

export default class tempmail$id$vn implements ProviderImpl {
    bodies: Record<string, string> = {};
    dates: Record<string, number> = {};

    $livewire = new LWUpdate('tempmail.id.vn');

    async getDomains(): Promise<string[]> {
        const req = await fish('https://tempmail.id.vn/');
        const res = await req.text();

        const matchedDomains = res.match(/<option value="(.*?)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        const [user, domain] = address.split('@');

        await this.$livewire.pullHTML();

        this.$livewire.updates = { domain, customMail: user };
        this.$livewire.directCall('temp-mail.home', 'saveCustomMail');
        await this.$livewire.sendoff();

        await this.$livewire.pullHTML('/inbox');
    }

    async getMail(address: string): Promise<Mail[]> {
        this.$livewire.directCall('temp-mail.inbox', 'loadTable');
        const res = await this.$livewire.sendoff();

        const rows = parse(res.components[0].effects.html).querySelectorAll('tr.fi-ta-row');

        return Promise.all(rows.map(async (row) => {
            const link = row.querySelector('a.fi-ta-col')!.getAttribute('href')!;

            if (!this.bodies[link]) {
                const req = await fish(link, { headers: { cookie: this.$livewire.$cookie } });
                const html = parse(await req.text());
                this.bodies[link] = html.querySelector('iframe[srcdoc]')?.getAttribute('srcdoc') || '';
            }

            if (!this.dates[link]) {
                const [, amount, unit] = row.querySelector('td.fi-ta-cell-created-at')!.text.trim().match(/(\d+)\s*(\S+)/) || [];
                this.dates[link] = Date.now() - Number(amount || 0) * (unitMs[unit] || 0);
            }

            return {
                id: link,
                from: row.querySelector('.fi-ta-text-description')!.text.trim(),
                to: address,
                subject: row.querySelector('td.fi-ta-cell-subject')!.text.trim(),
                body: this.bodies[link],
                date: this.dates[link]
            };
        }));
    }
}
