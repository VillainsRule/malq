import wafFetch from '../../util/waf/fetch';

import Provider, { type Mail } from '../Provider';

export default class _10minutemail$com extends Provider {
    $cookie = '';

    async getAddress(): Promise<string> {
        const addressReq = await wafFetch('https://10minutemail.com/session/address');
        const addressRes = await addressReq.json() as { address: string };

        this.address = addressRes.address;

        const setCookie = typeof addressReq.headers['set-cookie'] === 'string' ? [addressReq.headers['set-cookie']] : addressReq.headers['set-cookie'] || [];
        this.$cookie = setCookie.map((c: string) => c.split(';')[0]).join('; ');

        return addressRes.address;
    }

    async getMail(): Promise<Mail[]> {
        const fetchReq = await wafFetch('https://10minutemail.com/messages/messagesAfter/0', {
            headers: {
                'Cookie': this.$cookie!
            }
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