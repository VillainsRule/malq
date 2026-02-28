import LWMessage from '../../../util/livewire/LWMessage';

import { getRandomName } from '../../../util/names';

import Provider, { type Mail } from '../../Provider';

// this site hides the domains until you create an email
// so the setDomain is *slightly* different

export default class temp_mail$club extends Provider {
    livewire: LWMessage = new LWMessage('temp-mail.club', true);

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML('');

        const domains = this.livewire.html.match(/setDomain\('([0-9]+)', '(.*?)'\)/g) || [];
        const randomDomain = domains[domains.length * Math.random() | 0];
        const [, id, domain] = randomDomain.match(/setDomain\('([0-9]+)', '(.*?)'\)/)!;

        const user = getRandomName();

        this.livewire.queueCallMethod('frontend.actions', 'setDomain', [id, domain]);
        this.livewire.queueSyncInput('frontend.actions', 'user', user);
        this.livewire.queueCallMethod('frontend.actions', 'create');

        await this.livewire.sendQueue('frontend.actions');
        await this.livewire.pullHTML('/mailbox');

        const realEmail = this.livewire.components['frontend.actions'].serverMemo.data.email;

        this.address = realEmail;
        return realEmail;
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