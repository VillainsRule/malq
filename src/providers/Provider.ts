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
}

export default Provider;