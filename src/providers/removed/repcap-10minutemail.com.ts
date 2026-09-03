import wafFetch from '@/util/waf/fetch';

import type { Mail, ProviderImpl } from '../Provider';

export default class _10minutemail$com implements ProviderImpl {
    $cookie = '';

    async getDomains(): Promise<string[]> {
        return [];
    }

    async createInbox(address: string): Promise<void> {
        const addressReq = await wafFetch('https://10minutemail.com/session/address');
        const addressRes = await addressReq.json() as { address: string };

        address = addressRes.address;

        const setCookie = typeof addressReq.headers['set-cookie'] === 'string' ? [addressReq.headers['set-cookie']] : addressReq.headers['set-cookie'] || [];
        this.$cookie = setCookie.map((c: string) => c.split(';')[0]).join('; ');

        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const fetchReq = await wafFetch('https://10minutemail.com/messages/messagesAfter/0', {
            headers: { 'Cookie': this.$cookie }
        });

        const fetchRes = await fetchReq.json() as {
            sender: string;
            recipient: string;
            subject: string;
            sentDate: string;
            bodyHtmlContent: string;
            bodyPlainText: string;
        }[];

        const returnableMail: Mail[] = fetchRes.map((email) => ({
            from: email.sender,
            to: email.recipient,
            subject: email.subject,
            body: email.bodyPlainText || email.bodyHtmlContent,
            date: new Date(email.sentDate).getTime()
        }));

        return returnableMail;
    }
}