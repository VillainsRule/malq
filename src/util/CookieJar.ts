export default class CookieJar {
    private cookies = new Map<string, string>();

    addSetCookie(rawCookieStrings: string[]): void {
        for (const raw of rawCookieStrings) {
            const semi = raw.indexOf(';');
            const pair = semi === -1 ? raw : raw.slice(0, semi);
            const eq = pair.indexOf('=');
            if (eq === -1) return;
            const name = pair.slice(0, eq).trim();
            if (!name) return;
            this.cookies.set(name, pair.slice(eq + 1).trim());
        }
    }

    getCookie(): string {
        const parts: string[] = [];
        for (const [name, value] of this.cookies) {
            if (value !== '""') parts.push(`${name}=${value}`);
        }
        return parts.join('; ');
    }
}