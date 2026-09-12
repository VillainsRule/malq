import crypto from 'node:crypto';

import { fish, toEST } from '@/util/util';

import type { Mail, ProviderImpl } from '../Provider';

const evpKDF = (password: string, salt: Buffer): { key: Buffer; iv: Buffer } => {
    const passBytes = Buffer.from(password, 'utf8');
    let derived = Buffer.alloc(0);
    let block = Buffer.alloc(0);
    while (derived.length < 48) {
        block = crypto.createHash('md5').update(Buffer.concat([block, passBytes, salt])).digest();
        derived = Buffer.concat([derived, block]);
    }
    return { key: derived.subarray(0, 32), iv: derived.subarray(32, 48) };
};

const encrypt = (data: string, passphrase: string): string => {
    const salt = crypto.randomBytes(8);
    const { key, iv } = evpKDF(passphrase, salt);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    return Buffer.concat([Buffer.from('Salted__'), salt, encrypted]).toString('base64');
};

const decrypt = (ciphertextB64: string, passphrase: string): string => {
    const raw = Buffer.from(ciphertextB64, 'base64');
    const salt = raw.subarray(8, 16);
    const ciphertext = raw.subarray(16);
    const { key, iv } = evpKDF(passphrase, salt);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

export default class ezmail$pro implements ProviderImpl {
    aesKey: string;

    async getDomains(): Promise<string[]> {
        const req = await fish('https://ezmail.pro');
        const res = await req.text();

        const domains = res.match(/"domain":"(.*?)"/g)!;
        return domains.map(e => e.match(/"domain":"(.*?)"/)![1]);
    }

    async createInbox(_address: string): Promise<void> {
        const req = await fish('https://ezmail.pro');
        const res = await req.text();

        this.aesKey = res.match(/%20%22([a-f0-9]{16})%22/)![1];
    }

    async getMail(address: string): Promise<Mail[]> {
        const encrypted = encodeURIComponent(encrypt(JSON.stringify({ email: address }), this.aesKey));

        const req = await fetch('https://ezmail.pro/?action=get_emails', {
            method: 'POST',
            body: JSON.stringify({ encrypted }),
            headers: { 'content-type': 'application/json', 'referer': 'https://ezmail.pro/' }
        });

        const raw = await req.json() as { encrypted: string };
        const decrypted = decrypt(decodeURIComponent(raw.encrypted), this.aesKey);
        const res = JSON.parse(decrypted) as {
            data: {
                subject: string,
                from_field: string,
                date: string,
                html_content: string
            }[]
        };

        const returnableMail: Mail[] = res.data.map((email) => ({
            from: email.from_field,
            to: address,
            subject: email.subject,
            body: email.html_content,
            date: toEST(new Date(email.date).getTime(), 7)
        }));

        return returnableMail;
    }
}