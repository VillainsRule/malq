export interface Mail {
    id?: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    date: number;
}

class Provider {
    address: string = '';
    mail: Mail[] = [];

    getAddress(): Promise<string> {
        throw new Error(this.constructor.name + ' has not implemented getAddress()');
    }

    getMail(): Promise<Mail[]> {
        throw new Error(this.constructor.name + ' has not implemented getMail()');
    }

    destroy(): void { }

    fetch(url: string, options: RequestInit = {}) {
        if (process.env.PROXY) (options as any).proxy = process.env.PROXY;
        return fetch(url, options);
    };

    toEST(date: number, utcOffset: number): number {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' });
        const parts = formatter.formatToParts(new Date(date));
        const offset = parts.find(p => p.type === 'timeZoneName')?.value;
        const estOffset = parseInt(offset?.replace('GMT', '') ?? '-5');
        const sourceMs = utcOffset * 60 * 60 * 1000;
        const targetMs = estOffset * 60 * 60 * 1000;
        return date - sourceMs + targetMs;
    }
}

export default Provider;