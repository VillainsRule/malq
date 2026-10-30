import lwMessageCommons from './_constructor';

import { fish } from '@/util/util';

export default class emailct$com extends lwMessageCommons {
    domainsPath = '/mailbox';
    initialPath = '/mailbox';
    refetchPath = '/mailbox';

    constructor() {
        super('emailct.com', false);
    }

    async getDomains(): Promise<string[]> {
        const req = await fish(`https://${this.domain}${this.domainsPath}`);
        const res = await req.text();

        const select = res.match(/<select id="emailct-domain".*?<\/select>/s)![0];
        return [...select.matchAll(/<option value="(.*?)"/g)].map((e) => e[1]);
    }

    async createInbox(address: string): Promise<void> {
        await this.livewire.pullHTML(this.initialPath);

        const [user, domain] = address.split('@');

        this.livewire.queueSyncInput('frontend.actions', 'domain', domain);
        this.livewire.queueSyncInput('frontend.actions', 'user', user);
        this.livewire.queueCallMethod('frontend.actions', 'create');

        await this.livewire.sendQueue('frontend.actions');
        await this.livewire.pullHTML(this.refetchPath);
    }
}
