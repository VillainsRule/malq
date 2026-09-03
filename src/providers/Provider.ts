export interface Mail {
    id?: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    date: number;
}

export interface ProviderImpl {
    getDomains(): Promise<string[]>;
    createInbox(address: string): Promise<void>;
    getMail(address: string): Promise<Mail[]>;
}