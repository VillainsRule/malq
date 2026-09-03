type Single<T extends any[]> = T[number];

export default class Domains {
    private static data: Record<string, string[]> = {};

    static getAll(provider: string): string[] {
        return this.data[provider];
    }

    static getRandom(provider: string): Single<string[]> {
        const all = this.data[provider];
        return all[all.length * Math.random() | 0];
    }

    static set(provider: string, domains: string[]) {
        this.data[provider] = domains;
    }
}