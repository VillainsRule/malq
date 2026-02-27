import LWUpdate from '../../../util/livewire/LWUpdate';

import Provider, { type Mail } from '../../Provider';

export default class temp_mail$asia extends Provider {
    livewire: LWUpdate = new LWUpdate('temp-mail.asia');

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML();

        const email = this.livewire.html.match(/const email = '(.*?)'/)?.[1];
        if (!email) throw new Error('[temp-mail.asia] (livewire) email not found in HTML');

        this.livewire.dispatch('pages.frontend.action', 'syncEmail', { email });
        this.livewire.dispatch('mail', 'syncEmail', { email });
        await this.livewire.sendoff();
        await this.livewire.pullHTML('/');

        this.address = email;
        return email;
    }

    async getMail(): Promise<Mail[]> {
        this.livewire.dispatch('pages.frontend.inbox', 'fetchMessages');

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