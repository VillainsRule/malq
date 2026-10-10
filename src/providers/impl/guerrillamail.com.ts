import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const api = 'https://api.guerrillamail.com/ajax.php';
const agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export default class guerrillamail$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    $sid = '';

    async getDomains(): Promise<string[]> {
        const req = await fish('https://www.guerrillamail.com/', { headers: { 'user-agent': agent } });
        const res = await req.text();

        const matchedDomains = res.match(/<option value="([^"]+)">/g) || [];
        return matchedDomains.map(d => d.match(/<option value="(.*?)">/)![1]).filter(d => d.includes('.'));
    }

    async createInbox(address: string): Promise<void> {
        const [user, domain] = address.split('@');

        const initReq = await fish(`${api}?f=get_email_address&lang=en&ip=127.0.0.1&agent=${encodeURIComponent(agent)}`, { headers: { 'user-agent': agent } });
        const initRes = await initReq.json() as { sid_token: string };

        const setReq = await fish(`${api}?f=set_email_user&sid_token=${initRes.sid_token}`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': agent },
            body: `email_user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}&lang=en`
        });
        const setRes = await setReq.json() as { sid_token: string };

        this.$sid = setRes.sid_token || initRes.sid_token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`${api}?f=get_email_list&offset=0&sid_token=${this.$sid}`, { headers: { 'user-agent': agent } });
        const res = await req.json() as {
            list: {
                mail_id: string,
                mail_from: string,
                mail_subject: string,
                mail_timestamp: string
            }[]
        };

        const returnableMail: Mail[] = res.list.map((email) => ({
            id: email.mail_id,
            from: email.mail_from,
            to: address,
            subject: email.mail_subject,
            body: this.bodies[email.mail_id] || '',
            date: Number(email.mail_timestamp) * 1000
        }));

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await fish(`${api}?f=fetch_email&email_id=${e.id}&sid_token=${this.$sid}`, { headers: { 'user-agent': agent } }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.json() as { mail_body: string };
                e.body = bodyRes.mail_body;
                this.bodies[e.id!] = e.body;
            });

            return e;
        }));

        return finalMail.filter(e => e.from !== 'no-reply@guerrillamail.com');
    }
}
