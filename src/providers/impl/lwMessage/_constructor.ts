import LWMessage from '@/util/livewire/LWMessage';

import getRandomName from '@/util/names';

import Provider, { type Mail } from '../../Provider';

export default class lwMessageCommons extends Provider {
    domain = '';
    bypassWAF = true;

    initialPath = '';
    refetchPath = '';
    allowsDomainChange = true;

    livewire: LWMessage;

    constructor(domain: string, bypassWAF: boolean) {
        super();

        this.domain = domain;
        this.bypassWAF = bypassWAF;
        this.livewire = new LWMessage(this.domain, this.bypassWAF);
    }

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML(this.initialPath);

        if (this.allowsDomainChange) {
            const domains = this.livewire.html.match(/setDomain\('(.*?)'\)/g) || [];
            const randomDomain = domains[domains.length * Math.random() | 0];
            const domain = randomDomain.match(/setDomain\('(.*?)'\)/)?.[1];

            const user = getRandomName();
            const email = `${user}@${domain}`;

            this.livewire.queueCallMethod('frontend.actions', 'setDomain', [domain]);
            this.livewire.queueSyncInput('frontend.actions', 'user', user);
            this.livewire.queueCallMethod('frontend.actions', 'create');

            await this.livewire.sendQueue('frontend.actions');
            await this.livewire.pullHTML(this.refetchPath);

            this.address = email;
        } else {
            const email = this.livewire.html.match(/const email = '(.*?)'/)?.[1];
            if (!email) throw new Error('email not found in HTML');

            await this.livewire.fireSingleEvent('frontend.actions', 'syncEmail', [email]);
            await this.livewire.fireSingleEvent('frontend.app', 'syncEmail', [email]);

            this.address = email;
        }

        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const res2 = await this.livewire.fireSingleEvent('frontend.app', 'fetchMessages');
        const messages = res2.serverMemo.data?.messages || [];

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: this.address,
            subject: msg.subject,
            body: msg.content,
            date: new Date(msg.date).getTime()
        }));
    }
}