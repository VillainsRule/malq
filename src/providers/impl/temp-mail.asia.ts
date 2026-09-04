import { parse } from 'node-html-parser';

import LWUpdate from '@/util/livewire/LWUpdate';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class temp_mail$asia implements ProviderImpl {
    livewire: LWUpdate = new LWUpdate('temp-mail.asia');

    async getDomains(): Promise<string[]> {
        const req = await fish('https://temp-mail.asia');
        const res = await req.text();
        const dom = parse(res);

        return dom.querySelectorAll('option').filter(e => !e.getAttribute('disabled')).map(e => e.getAttribute('value')!);
    }

    async createInbox(address: string): Promise<void> {
        await this.livewire.pullHTML();

        this.livewire.dispatch('frontend.components.action', 'syncEmail', { email: address });
        this.livewire.dispatch('frontend.components.token-login', 'syncEmail', { email: address });
        this.livewire.dispatch('frontend.components.check-mail', 'syncEmail', { email: address });
        this.livewire.dispatch('frontend.components.inbox-message', 'syncEmail', { email: address });
    }

    async getMail(address: string): Promise<Mail[]> {
        this.livewire.dispatch('frontend.components.inbox-message', 'fetchMessages');

        const res2 = await this.livewire.sendoff();
        const snapshot = JSON.parse(res2.components[0].snapshot);
        const messages = (snapshot.data.messages || [[]])[0].map((e: any) => e[0]);

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: address,
            subject: msg.subject,
            body: msg.content,
            date: toEST(new Date(msg.date).getTime(), 0)
        }));
    }
}