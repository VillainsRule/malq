import LWUpdate from '@/util/livewire/LWUpdate';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class priyo$email implements ProviderImpl {
    livewire: LWUpdate = new LWUpdate('priyo.email');

    async getDomains(): Promise<string[]> {
        const req = await fish(`https://${this.livewire.host}`);
        const res = await req.text();

        const matchedDomains = res.match(/<option\s*value="(.*?)"/g) || [];
        return matchedDomains.map(d => d.match(/<option\s*value="(.*?)"/)![1]);
    }

    async createInbox(address: string): Promise<void> {
        await this.livewire.pullHTML();

        this.livewire.dispatch('themes.components.account-actions', 'syncEmail', { email: address });
        this.livewire.dispatch('themes.components.action', 'syncEmail', { email: address });
        this.livewire.dispatch('themes.components.inbox-message', 'syncEmail', { email: address });
        this.livewire.dispatch('themes.components.inbox-message', 'fetchMessages');
        await this.livewire.sendoff();
    }

    async getMail(address: string): Promise<Mail[]> {
        this.livewire.dispatch('themes.components.inbox-message', 'fetchMessages');

        const res2 = await this.livewire.sendoff();
        const snapshot = JSON.parse(res2.components[0].snapshot);
        const messages = snapshot.data.messages[0].map((e: any) => e[0]);

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: address,
            subject: msg.subject,
            body: msg.content,
            date: toEST(new Date(msg.date).getTime(), 0)
        }));
    }
}