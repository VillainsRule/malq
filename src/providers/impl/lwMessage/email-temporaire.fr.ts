import lwMessageCommons from './_constructor';

import type { Mail } from '../../Provider';

export default class email$temporaire$fr extends lwMessageCommons {
    domainsPath = '/';
    initialPath = '/';
    refetchPath = '/mailbox';

    constructor() {
        super('email-temporaire.fr', false);
    }

    async getMail(address: string): Promise<Mail[]> {
        const res = await this.livewire.fireSingleEvent('frontend.app', 'fetchMessages');

        const messages = (res.serverMemo.data?.messages || []) as {
            subject: string,
            content: string,
            sender_email: string,
            timestamp: { date: string }
        }[];

        return messages.map((msg) => ({
            from: msg.sender_email,
            to: address,
            subject: msg.subject,
            body: msg.content,
            date: new Date(msg.timestamp.date.slice(0, 19).replace(' ', 'T') + 'Z').getTime()
        }));
    }
}
