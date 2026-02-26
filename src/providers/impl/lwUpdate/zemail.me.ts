import LWUpdate from '../../../util/livewire/LWUpdate';

import { getRandomName } from '../../../util/names';

import Provider, { type Mail } from '../../Provider';

export default class zemail$me extends Provider {
    livewire: LWUpdate = new LWUpdate('zemail.me');

    async getAddress(): Promise<string> {
        await this.livewire.pullHTML('');

        const domains = this.livewire.html.match(/setDomain\('(.*?)'\)/g)?.filter(f => !f.startsWith('g')) || [];
        const randomDomain = domains[domains.length * Math.random() | 0];
        const domain = randomDomain.match(/setDomain\('(.*?)'\)/)?.[1];

        const user = getRandomName().slice(0, 15);
        const email = `${user}@${domain}`;

        this.livewire.updates = { username: user, domain };
        this.livewire.directCall('frontend.action', 'create');

        await this.livewire.sendoff();
        await this.livewire.pullHTML('/mailbox');

        this.address = email;
        return email;
    }

    isFirstMailPull = true;

    async getMail(): Promise<Mail[]> {
        if (this.isFirstMailPull) {
            this.livewire.dispatch('frontend.mailbox', 'syncMailbox', [this.address!]);
            this.isFirstMailPull = false;
        }

        this.livewire.dispatch('frontend.mailbox', 'fetchMessages');

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