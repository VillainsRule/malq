import LWUpdate from '@/util/livewire/LWUpdate';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class postinbox$org implements ProviderImpl {
    livewire: LWUpdate = new LWUpdate('postinbox.org');

    async getDomains(): Promise<string[]> {
        const homeReq = await fish('https://postinbox.org/', {
            redirect: 'manual',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
            }
        });
        const homeRes = await homeReq.text();

        const domainMatches = homeRes.match(/\$wire\.setDomain\('(.*?)'/g)!;
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

        void 0;
    }

    isFirstMailPull = true;

    async getMail(address: string): Promise<Mail[]> {
        if (this.isFirstMailPull) {
            this.livewire.dispatch('frontend.actions', 'syncEmail', { email: address });
            this.livewire.dispatch('frontend.app', 'syncEmail', { email: address });
            this.isFirstMailPull = false;
        }

        this.livewire.dispatch('frontend.app', 'fetchMessages');

        const res2 = await this.livewire.sendoff();
        const snapshot = JSON.parse(res2.components[0].snapshot);
        const messages = (snapshot.data.messages || [[]])[0].map((e: any) => e[0]);

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: address,
            subject: msg.subject,
            body: msg.content,
            date: new Date(msg.date).getTime()
        }));
    }
}