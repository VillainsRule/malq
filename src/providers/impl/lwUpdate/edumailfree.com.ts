import LWUpdate from '../../../util/livewire/LWUpdate';

import Provider, { type Mail } from '../../Provider';

export default class edumailfree$com extends Provider {
    livewire: LWUpdate = new LWUpdate('edumailfree.com');

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML();

        this.livewire.directCall('frontend.actions', 'random');
        const response = await this.livewire.sendoff();
        const snapshot = JSON.parse(response.components[0].snapshot);
        const email = snapshot.data.email;

        await this.livewire.pullHTML('/mailbox');

        this.livewire.dispatch('frontend.actions', 'syncEmail', { email });
        this.livewire.dispatch('frontend.app', 'syncEmail', { email });
        this.livewire.dispatch('frontend.app', 'fetchMessages');
        await this.livewire.sendoff();

        this.address = email;
        return email;
    }

    async getMail(): Promise<Mail[]> {
        this.livewire.dispatch('frontend.app', 'fetchMessages');

        const res2 = await this.livewire.sendoff();
        const snapshot = JSON.parse(res2.components[0].snapshot);
        const messages = snapshot.data.messages[0].map((e: any) => e[0]);

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: this.address!,
            subject: msg.subject,
            body: msg.content,
            date: new Date(msg.date).getTime()
        }));
    }
}