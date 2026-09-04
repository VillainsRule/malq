import LWUpdate from '@/util/livewire/LWUpdate';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class lwUpdateDomainCommons implements ProviderImpl {
    livewire: LWUpdate;

    constructor(domain: string, bypassWAF: boolean) {
        this.livewire = new LWUpdate(domain, bypassWAF);
    }

    async getDomains(): Promise<string[]> {
        const req = await fish(`https://${this.livewire.host}`);
        const res = await req.text();

        const domainMatches = res.match(/\$wire\.setDomain\('(.*?)'/g)!;
        const extractedDomains = domainMatches.map(e => e.match(/\$wire.setDomain\('(.*?)'/)![1]);
        return [...new Set(extractedDomains)];
    }

    async createInbox(address: string): Promise<void> {
        await this.livewire.pullHTML();

        const [user, domain] = address.split('@');

        this.livewire.directCall('frontend.actions', 'setDomain', [domain]);
        this.livewire.updates = { user };
        this.livewire.directCall('frontend.actions', 'create');

        await this.livewire.sendoff();
        await this.livewire.pullHTML('/mailbox');

        this.livewire.dispatch('frontend.actions', 'syncEmail', { email: address });
        this.livewire.dispatch('frontend.app', 'syncEmail', { email: address });
    }

    async getMail(address: string): Promise<Mail[]> {
        this.livewire.dispatch('frontend.app', 'fetchMessages');

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