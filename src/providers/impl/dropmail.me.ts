import Provider, { type Mail } from '../Provider';

export default class DropMail$me extends Provider {
    $mailToken: string | null = null;
    $ws: WebSocket | null = null;

    async getAddress(): Promise<string> {
        const ws = new WebSocket('wss://dropmail.me/websocket');

        const address = await new Promise<string>((resolve) => {
            const listener = (msg: MessageEvent) => {
                if (msg.data.startsWith('A')) resolve(msg.data.match(/A(.*?):/)[1]);

                if (msg.data.startsWith('I')) {
                    const theJSON = JSON.parse(msg.data.slice(1));

                    this.mail.push({
                        from: theJSON.from_mail,
                        to: theJSON.to_mail_orig,
                        subject: theJSON.subject,
                        body: theJSON.text,
                        date: new Date(theJSON.received).getTime()
                    });
                }
            };

            ws.addEventListener('message', listener);

            this.$ws = ws;
        });

        this.address = address;

        return address;
    }

    async getMail(): Promise<Mail[]> {
        return Promise.resolve(this.mail);
    }

    destroy() {
        if (this.$ws) this.$ws.close();
    }
}