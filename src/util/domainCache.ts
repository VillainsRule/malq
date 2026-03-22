export class StringDomainCache {
    private cache: string[] = [];

    hasItems(): boolean {
        return this.cache.length > 0;
    }

    pull(): string {
        return this.cache[this.cache.length * Math.random() | 0];
    }

    set(values: string[]): void {
        this.cache.push(...values);
    }
}

type ObjectDomain = { id: string, domain: string };

export class ObjectDomainCache {
    private cache: ObjectDomain[] = [];

    hasItems(): boolean {
        return this.cache.length > 0;
    }

    pull(): ObjectDomain {
        return this.cache[this.cache.length * Math.random() | 0];
    }

    set(values: ObjectDomain[]): void {
        this.cache.push(...values);
    }
}