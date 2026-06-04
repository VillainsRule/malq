import getRandomName from '@/util/names';

import Provider, { type Mail } from '../Provider';

export default class nguyendoll$com extends Provider {
    async getAddress(): Promise<string> {
        let attempts = 0;
        let domain = '';

        const req = await this.fetch('https://nguyendoll.com');
        const res = await req.text();

        const domains = res.match(/"domain":"(.*?)"/g) || [];

        while (!domain && attempts < 5) {
            let attemptingDomain = domains[Math.floor(Math.random() * domains.length)];
            let extractedDomain = attemptingDomain.match(/"domain":"(.*?)"/)?.[1];

            const req = await this.fetch('https://nguyendoll.com/api/check_mx.php?domain=' + extractedDomain);
            const res = await req.json() as { hasMX: boolean, mxRecords: string[] };

            if (res.hasMX && res.mxRecords.length === 1 && res.mxRecords[0] && res.mxRecords[0].includes('nguyendoll')) {
                domain = extractedDomain!;
                break;
            }

            attempts++;
        }

        const user = getRandomName();

        this.address = `${user}@${domain}`;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const req = await this.fetch('https://nguyendoll.com/api/get_mail.php?email=' + encodeURIComponent(this.address));
        const res = await req.json() as {
            data: {
                subject: string,
                from_field: string,
                date: string,
                html_content: string
            }[];
        }

        const returnableMail: Mail[] = res.data.map((email) => ({
            from: email.from_field,
            to: this.address,
            subject: email.subject,
            body: email.html_content,
            date: new Date(email.date).getTime()
        }));

        return returnableMail;
    }
}