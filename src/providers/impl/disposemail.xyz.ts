import { parse } from 'node-html-parser';

import { fish } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

export default class disposemail$xyz implements ProviderImpl {
    $token: string;

    async getDomains(): Promise<string[]> {
        const req = await fish('https://disposemail.xyz');
        const res = await req.text();
        const dom = parse(res);

        const mainChunks = dom.querySelectorAll('script')
            .filter(e => e.getAttribute('async') === '' && e.getAttribute('src') && e.parentNode.tagName === 'HEAD')
            .map(e => e.getAttribute('src'));

        const mainChunkReq = await fish(`https://disposemail.xyz${mainChunks[mainChunks.length - 1]}`);
        const mainChunk = await mainChunkReq.text();

        const matchedDomains = mainChunk.match(/let [a-z]=\["(.*?)"\]/)![1]!;
        const domains = matchedDomains.split('","') as string[];

        return domains;
    }

    async createInbox(address: string): Promise<void> {
        const req = await fish('https://disposemail.xyz/api/session/generate', {
            method: 'POST',
            body: JSON.stringify({ email: address }),
            headers: { 'content-type': 'application/json' }
        });

        const res = await req.json() as { token: string };

        this.$token = res.token;
    }

    async getMail(address: string): Promise<Mail[]> {
        const req = await fish(`https://disposemail.xyz/x-feed/emails?address=${encodeURIComponent(address)}`);
        const res = await req.json() as {
            from_address: string,
            address: string,
            subject: string,
            text: string,
            html: string,
            received_at: number
        }[];

        const returnableMail: Mail[] = res.map((email) => ({
            from: email.from_address,
            to: email.address,
            subject: email.subject,
            body: email.text || email.html,
            date: email.received_at
        }));

        return returnableMail;
    }
}