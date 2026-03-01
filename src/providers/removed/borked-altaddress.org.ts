import parse from 'node-html-parser';
import { getRandomName } from '../../util/names';
import Provider, { type Mail } from '../Provider';

// some domains don't work (hidefrom.us), so removed for now

export default class altaddress$org extends Provider {
    $cookie = '';

    fullBodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const req = await this.fetch('https://altaddress.org');
        const res = await req.text();

        const domainMatches = res.match(/<option value="(.*?)"/g) || [];
        const uniqueMatches = [...new Set(domainMatches)].filter(e => e.includes('.'));
        const randomDomain = uniqueMatches[Math.floor(Math.random() * uniqueMatches.length)];
        const domain = randomDomain.match(/<option value="(.*?)"/)![1];

        const user = getRandomName();

        const loginReq = await this.fetch('https://altaddress.org/login', {
            method: 'POST',
            body: `email=${user}&domain=${domain}`,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            redirect: 'manual'
        });

        this.$cookie = loginReq.headers.get('set-cookie')?.split(';')[0]!;
        
        this.address = `${user}@${domain}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch(`https://altaddress.org/inbox`, {
            headers: { cookie: this.$cookie }
        });

        const res = await req.text();
        const dom = parse(res);

        const container = dom.querySelector('#inbox-messagelist-container');
        if (container?.innerText.startsWith('Mailbox is empty')) return [];

        return [];
    }
}