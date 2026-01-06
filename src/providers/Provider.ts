export interface Mail {
    id?: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    date: number;
}

class Provider {
    address?: string | null = null;

    mail: Mail[] = [];
    knownMailSignatures: Set<string> = new Set();

    getAddress(): Promise<string> {
        throw new Error(this.constructor.name + ' has not implemented getAddress()');
    }

    getMail(): Promise<Mail[]> {
        throw new Error(this.constructor.name + ' has not implemented getMail()');
    }

    destroy(): void { }

    encode(mail: Mail) {
        return btoa(JSON.stringify(mail));
    }

    fetch(url: string, options: RequestInit = {}) {
        if (process.env.PROXY) (options as any).proxy = process.env.PROXY;
        return fetch(url, options);
    };
}

export default Provider;