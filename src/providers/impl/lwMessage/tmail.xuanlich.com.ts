import LWMessage from '../../../util/livewire/LWMessage';

import Provider, { type Mail } from '../../Provider';

export default class tmail$xuanlich$com extends Provider {
    livewire: LWMessage = new LWMessage('tmail.xuanlich.com');

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML();

        const email = this.livewire.html.match(/const email = '(.*?)'/)?.[1];
        if (!email) throw new Error('email not found in HTML');

        await this.livewire.fireSingleEvent('frontend.actions', 'syncEmail', [email]);
        await this.livewire.fireSingleEvent('frontend.app', 'syncEmail', [email]);

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