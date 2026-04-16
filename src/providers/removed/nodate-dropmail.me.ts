import Provider, { type Mail } from '../Provider';

// UNFINISHED

export default class dropmail$me extends Provider {
    $session = '';
    $token = '';

    async getAddress(): Promise<string> {
        const tokenReq = await this.fetch('https://dropmail.me/api/token/generate');
        const tokenRes = await tokenReq.json() as { token: string };

        this.$token = tokenRes.token;

        const addressReq = await this.fetch('https://dropmail.me/api/graphql/' + tokenRes.token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'mutation {introduceSession {id, expiresAt, addresses {address}}}' })
        });

        const addressRes = await addressReq.json() as {
            data: {
                introduceSession: {
                    id: string;
                    expiresAt: string;
                    addresses: {
                        address: string;
                    }[];
                }
            }
        };

        this.$session = addressRes.data.introduceSession.id;

        this.address = addressRes.data.introduceSession.addresses[0].address;
        return this.address;
    }

    async getMail(): Promise<Mail[]> {
        const fetchReq = await this.fetch('https://dropmail.me/api/graphql/' + this.$token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'query ($id: ID!) {session(id:$id) { addresses {address}, mails{rawSize, fromAddr, toAddr, downloadUrl, text, headerSubject}} }',
                variables: { id: this.$session }
            })
        });

        const fetchRes = await fetchReq.json() as {
            data: {
                session: {
                    addresses: { address: string }[];
                    mails: {
                        rawSize: number;
                        fromAddr: string;
                        toAddr: string;
                        downloadUrl: string;
                        text: string;
                        headerSubject: string;
                    }[];
                }
            }
        };

        const returnableMail: Mail[] = fetchRes.data.session.mails.map((email) => ({
            from: email.fromAddr,
            to: email.toAddr,
            subject: email.headerSubject,
            body: email.text,
            // @ts-expect-error this never worked
            date: new Date(email.sentDate).getTime()
        }));

        return returnableMail;
    }
}