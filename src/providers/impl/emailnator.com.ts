import parse from 'node-html-parser';

import wafFetch from '@/util/waf/fetch';

import Provider, { type Mail } from '../Provider';

const getTimeFromEstimate = (estimate: string): number => {
    const now = Date.now();
    const lower = estimate.trim().toLowerCase();

    if (lower === 'just now') return now;

    const match = lower.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(minute|hour|hr|second)s?\s+ago$/);
    if (!match) return 0;

    const wordMap: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };

    const amount = wordMap[match[1]] ?? parseInt(match[1], 10);
    const unit = match[2];

    if (unit === 'second') return now - amount * 1000;
    if (unit === 'minute') return now - amount * 60 * 1000;
    if (unit === 'hour' || unit === 'hr') return now - amount * 60 * 60 * 1000;

    return 0;
};

export default class emailnator$com extends Provider {
    $cookie: string = '';
    $xsrfToken: string = '';

    bodies: Record<string, string> = {};

    async getAddress(): Promise<string> {
        const mainReq = await wafFetch('https://www.emailnator.com/', {
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                'Origin': 'https://www.emailnator.com'
            }
        });

        this.updateCookies(mainReq.headers['set-cookie'] || []);

        const addressReq = await wafFetch('https://www.emailnator.com/generate-email', {
            method: 'POST',
            headers: {
                'Cookie': this.$cookie,
                'X-Xsrf-Token': this.$xsrfToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://www.emailnator.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

            },
            body: JSON.stringify({
                email: [
                    'domain',

                    // yes, gmail is good. unfortunately, they don't purge the inbox, and emails are out of space:
                    // https://sendtestmail.com/status/AHHvd3rY1fLEbH6BYibR / ca.mus.p.amm@gmail.com
                    // it is what it is; the goal of malq is to provide working mail as opposed to "hq" mail
                    // you can uncomment the below if your goal is different :P

                    // 'plusGmail',
                    // 'dotGmail'
                ]
            })
        });

        const addressRes = await addressReq.json() as { email: string | string[] };

        this.updateCookies(addressReq.headers['set-cookie'] || []);
        this.address = Array.isArray(addressRes.email) ? addressRes.email[0] : addressRes.email;

        return this.address;
    }

    private updateCookies(setCookieHeader: string | string[]) {
        const setCookieHeaders = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
        if (setCookieHeaders.length === 0) return;

        const cookieMap = new Map<string, string>();

        for (const part of this.$cookie.split('; ')) {
            if (!part) continue;
            const eqIdx = part.indexOf('=');
            if (eqIdx === -1) continue;
            const k = part.slice(0, eqIdx);
            const v = part.slice(eqIdx + 1);
            cookieMap.set(k, v);
        }

        const newCookies = setCookieHeaders.map(c => c.split(';')[0]);
        for (const cookie of newCookies) {
            if (!cookie) continue;
            const eqIdx = cookie.indexOf('=');
            if (eqIdx === -1) continue;
            const k = cookie.slice(0, eqIdx);
            const v = cookie.slice(eqIdx + 1);
            cookieMap.set(k, v);
            if (k === 'XSRF-TOKEN') this.$xsrfToken = decodeURIComponent(v);
        }

        this.$cookie = [...cookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }

    async getMail(): Promise<Mail[]> {
        const fetchReq = await wafFetch('https://www.emailnator.com/message-list', {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'x-requested-with': 'XMLHttpRequest',
                'Referer': 'https://www.emailnator.com/mailbox/',
                'Cookie': this.$cookie,
                'X-Xsrf-Token': this.$xsrfToken,
                'Content-Type': 'application/json',
                'Origin': 'https://www.emailnator.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            },
            method: 'POST',
            body: JSON.stringify({ email: this.address })
        });

        const res = await fetchReq.json() as {
            messageData: {
                messageID: string,
                from: string,
                subject: string,
                time: string
            }[];
        };

        const returnableMail: Mail[] = res.messageData.filter(e => e.from.includes('@')).map((email) => ({
            id: email.messageID,
            from: email.from,
            to: this.address,
            subject: email.subject,
            body: this.bodies[email.messageID] || '',
            date: getTimeFromEstimate(email.time)
        })).filter(e => e.date > 0);

        const finalMail: Mail[] = await Promise.all(returnableMail.map(async (e) => {
            if (!e.body && e.id) await this.fetch('https://www.emailnator.com/message-list', {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json',
                    'x-requested-with': 'XMLHttpRequest',
                    'Referer': 'https://www.emailnator.com/mailbox/',
                    'Cookie': this.$cookie,
                    'X-Xsrf-Token': this.$xsrfToken,
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.emailnator.com',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
                },
                method: 'POST',
                body: JSON.stringify({ email: this.address, messageID: e.id })
            }).then(async (bodyReq) => {
                const bodyRes = await bodyReq.text();
                const dom = parse(bodyRes);
                const body = dom.children[1].outerHTML;

                e.body = body;
                this.bodies[e.id!] = body;
            });

            return e;
        }));

        return finalMail;
    }
}