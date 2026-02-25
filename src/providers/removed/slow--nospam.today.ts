import LWMessage from '../../util/livewire/LWMessage';

import { getRandomName } from '../../util/names';

import Provider, { type Mail } from '../Provider';

export default class nospam$today extends Provider {
    livewire: LWMessage = new LWMessage('nospam.today', true);

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML('');

        const domains = this.livewire.html.match(/setDomain\('(.*?)'\)/g) || [];
        const randomDomain = domains[domains.length * Math.random() | 0];
        const domain = randomDomain.match(/setDomain\('(.*?)'\)/)?.[1];

        const user = getRandomName();
        const email = `${user}@${domain}`;

        this.livewire.queueCallMethod('frontend.actions', 'setDomain', [domain]);
        this.livewire.queueSyncInput('frontend.actions', 'user', user);
        this.livewire.queueCallMethod('frontend.actions', 'create');

        await this.livewire.sendQueue('frontend.actions');
        await this.livewire.pullHTML('/mailbox');

        this.address = email;
        return email;
    }

    async getMail(): Promise<Mail[]> {
        const res2 = await this.livewire.fireSingleEvent('frontend.app', 'fetchMessages');
        const messages = res2.serverMemo.data?.messages || [];

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: this.address!,
            subject: msg.subject,
            body: msg.content,
            date: new Date(msg.date).getTime()
        }));
    }
}