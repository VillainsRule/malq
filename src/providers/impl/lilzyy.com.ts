import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class lilzyy$com implements ProviderImpl {
    bodies: Record<string, string> = {};

    async getDomains(): Promise<string[]> {
        const req = await fish('https://lilzyy.com/api/tmail/public.php');
        const res = await req.json() as { domains: string[] };

        return res.domains;
    }

    async createInbox(_address: string): Promise<void> {
        void 0;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://lilzyy.com/api/tmail/inbox_poll.php?alias=${address}&last_uid=0`);
        const res = await req.json() as {
            list: {
                uid: number,
                emailDateMs: number,
                subject: string,
                fromAddr: string,
                bodyText: string,
                html: string,
                detailFile: string
            }[]
        };

        return await Promise.all(res.list.map(async (email) => {
            const id = String(email.uid);

            if (!this.bodies[id]) {
                let body = email.html;

                if (!body && email.detailFile) {
                    const detailReq = await fish(`https://lilzyy.com/api/tmail/detail_read.php?alias=${address}&uid=${id}&file=${encodeURIComponent(email.detailFile)}`);
                    const detailRes = await detailReq.json() as any;
                    body = detailRes.html || detailRes.mail?.html || '';
                }

                this.bodies[id] = body || email.bodyText;
            }

            return {
                id,
                from: email.fromAddr,
                to: address,
                subject: email.subject,
                body: this.bodies[id],
                date: email.emailDateMs
            };
        }));
    }
}
