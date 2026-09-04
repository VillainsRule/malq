import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../../Provider';

// errors out with "Address used" when you try to change, even on fully random addresses

export default class qaz$im implements ProviderImpl {
    $cookie = '';

    async getDomains(): Promise<string[]> {
        return [];
    }

    async createInbox(address: string): Promise<void> {
        const cookieReq = await fish('https://qaz.im');
        this.$cookie = cookieReq.headers.getSetCookie()[0].split(';')[0];

        const req = await fish('https://qaz.im/api-mail/public/?_=' + Date.now(), { headers: { 'Cookie': this.$cookie, 'User-agent': 'Mozilla/5.0' } });
        const res = await req.json() as { mailbox: string };
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish('https://qaz.im/api-mail/public/?_=' + Date.now(), { headers: { 'Cookie': this.$cookie, 'User-agent': 'Mozilla/5.0' } });

        const res = await req.json() as {
            messages: {
                subject: string,
                from_email: string,
                receivedAt: string,
                content: string
            }[]
        }

        const returnableMail: Mail[] = res.messages.map((email) => ({
            from: email.from_email,
            to: address,
            subject: email.subject,
            body: email.content,
            date: toEST(new Date(email.receivedAt).getTime(), 0)
        }));

        return returnableMail;
    }
}