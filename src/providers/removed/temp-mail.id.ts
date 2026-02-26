import LWUpdate from '../../../util/livewire/LWUpdate';

import { getRandomName } from '../../../util/names';

import Provider, { type Mail } from '../../Provider';

export default class tempmail$id extends Provider {
    livewire: LWUpdate = new LWUpdate('temp-mail.id', true);

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML('');

        const domains = this.livewire.html.match(/setDomain\('(.*?)'\)/g) || [];
        const randomDomain = domains[domains.length * Math.random() | 0];
        const domain = randomDomain.match(/setDomain\('(.*?)'\)/)?.[1];

        const user = getRandomName().slice(0, 15);
        const email = `${user}@${domain}`;

        this.livewire.directCall('frontend.actions', 'setDomain', [domain]);
        this.livewire.updates = { user };
        this.livewire.directCall('frontend.actions', 'create');

        await this.livewire.sendoff();
        await this.livewire.pullHTML('/mailbox');

        this.address = email;
        return email;
    }

    isFirstMailPull = true;

    async getMail(): Promise<Mail[]> {
        if (this.isFirstMailPull) {
            this.livewire.dispatch('frontend.actions', 'syncEmail', { email: this.address! });
            this.livewire.dispatch('frontend.app', 'syncEmail', { email: this.address! });
            this.isFirstMailPull = false;
        }

        this.livewire.dispatch('frontend.app', 'fetchMessages');

        const res2 = await this.livewire.sendoff();
        const snapshot = JSON.parse(res2.components[0].snapshot);
        const messages = (snapshot.data.messages || [[]])[0].map((e: any) => e[0]);

        return messages.map((msg: any) => ({
            from: msg.sender_email,
            to: this.address!,
            subject: msg.subject,
            body: msg.content,
            date: new Date(msg.date).getTime()
        }));
    }
}