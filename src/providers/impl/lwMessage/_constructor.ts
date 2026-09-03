import LWMessage from '@/util/livewire/LWMessage';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

export default class lwMessageCommons implements ProviderImpl {
    domain = '';
    bypassWAF = true;

    password = '';

    domainsPath = '';
    initialPath = '';
    refetchPath = '';

    livewire: LWMessage;

    ignoredEmails: string[] = [];

    constructor(domain: string, bypassWAF: boolean) {
        this.domain = domain;
        this.bypassWAF = bypassWAF;
        this.livewire = new LWMessage(this.domain, this.bypassWAF);
    }

    async getDomains(): Promise<string[]> {
        const homeReq = await fish(`https://${this.domain}${this.domainsPath}`, {
            redirect: 'manual',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
            }
        });
        const homeRes = await homeReq.text();

        const domainMatches = homeRes.match(/\$wire\.setDomain\('(.*?)'/g)!;
        const extractedDomains = domainMatches.map(e => e.match(/\$wire.setDomain\('(.*?)'/)![1]);
        return [...new Set(extractedDomains)];
    }

    async createInbox(address: string): Promise<void> {
        await this.livewire.pullHTML(this.initialPath);

        if (this.password) {
            await this.livewire.handlePassword(this.password);
            await this.livewire.pullHTML(this.initialPath);
        }

        const [user, domain] = address.split('@');

        this.livewire.queueCallMethod('frontend.actions', 'setDomain', [domain]);
        this.livewire.queueSyncInput('frontend.actions', 'user', user);
        this.livewire.queueCallMethod('frontend.actions', 'create');

        await this.livewire.sendQueue('frontend.actions');
        await this.livewire.pullHTML(this.refetchPath);
    }

    async getMail(address: string): Promise<Mail[]> {
        const res2 = await this.livewire.fireSingleEvent('frontend.app', 'fetchMessages');
        const messages = (res2.serverMemo.data?.messages || []) as {
            subject: string,
            content: string,
            sender_email: string,
            date: string
        }[];

        return messages.filter((e) => !this.ignoredEmails.includes(e.sender_email)).map((msg) => ({
            from: msg.sender_email,
            to: address,
            subject: msg.subject,
            body: msg.content,
            date: toEST(new Date(msg.date).getTime(), 0)
        }));
    }
}