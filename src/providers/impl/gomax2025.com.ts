import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class cheapluxurymail$xyz implements ProviderImpl {
    $apiKey = '';

    async getDomains(): Promise<string[]> {
        const domainReq = await fetch('http://gomax2025.com/');
        const domainRes = await domainReq.text();

        const domainMatches = domainRes.match(/<option value="(.*?)"/g) || [];
        const uniqueMatches = [...new Set(domainMatches)].filter(e => e.includes('.'));
        return uniqueMatches.map((e) => e.match(/<option value="(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        const apiKeyReq = await fetch('http://gomax2025.com/');
        const apiKeyRes = await apiKeyReq.text();

        this.$apiKey = apiKeyRes.match(/API_KEY = '(.*?)'/)![1];
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`http://gomax2025.com/api/messages/${encodeURIComponent(address)}/${this.$apiKey}`);

        const res = await req.json() as {
            sender_email: string,
            subject: string,
            timestamp: string,
            content: string
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            from: email.sender_email,
            to: address,
            subject: email.subject,
            body: email.content,
            date: new Date(email.timestamp).getTime()
        }));

        return returnableMail;
    }
}