import LWUpdate from '@/util/livewire/LWUpdate';

import Provider, { type Mail } from '../../Provider';

export default class temp_mail$asia extends Provider {
    livewire: LWUpdate = new LWUpdate('temp-mail.asia');

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML();

        const email = this.livewire.html.match(/const email = '(.*?)';/)?.[1]!;

        this.address = email;
        return email;
    }

    isFirstMailPull = true;

    async getMail(): Promise<Mail[]> {
        if (this.isFirstMailPull) {
            this.livewire.dispatch('frontend.components.action', 'syncEmail', { email: this.address });
            this.livewire.dispatch('frontend.components.token-login', 'syncEmail', { email: this.address });
            this.livewire.dispatch('frontend.components.check-mail', 'syncEmail', { email: this.address });
            this.livewire.dispatch('frontend.components.inbox-message', 'syncEmail', { email: this.address });
            this.isFirstMailPull = false;
        }

        this.livewire.dispatch('frontend.components.inbox-message', 'fetchMessages');

        const res2 = await this.livewire.sendoff();
        const snapshot = JSON.parse(res2.components[0].snapshot);
        const messages = (snapshot.data.messages || [[]])[0].map((e: any) => e[0]);

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: this.address,
            subject: msg.subject,
            body: msg.content,
            date: this.toEST(new Date(msg.date).getTime(), 0)
        }));
    }
}