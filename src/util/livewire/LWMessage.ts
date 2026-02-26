import wafFetch from '../waf/fetch';

class LWMessage {
    host: string;
    mustByapssWaf: boolean;

    html: string = '';
    $cookie: string = '';
    $csrfToken: string = '';

    components: Record<string, {
        fingerprint: {
            id: string;
            name: string;
            locale: string;
            path: string;
            method: string;
            v: string;
            [key: string]: any;
        };
        serverMemo: {
            children: any[];
            errors: any[];
            htmlHash: string;
            data: Record<string, any>;
            dataMeta: any[];
            checksum: string;
            [key: string]: any;
        };
    }> = {};

    constructor(host: string, mustByapssWaf = false) {
        this.host = host;
        this.mustByapssWaf = mustByapssWaf;
    }

    async pullHTML(customPath: string = '/') {
        const req = await (this.mustByapssWaf ? wafFetch : fetch)(`https://${this.host}${customPath}`, {
            headers: this.$cookie ? { 'Cookie': this.$cookie } : { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' }
        });

        const html = await req.text();
        this.html = html;
        this.$csrfToken = html.match(/livewire_token = '(.*?)'/)?.[1] || '';

        const initialDataMatches = html.matchAll(/wire:initial-data="(.*?)"/gs);
        for (const match of initialDataMatches) {
            try {
                const decoded = decodeURIComponent(match[1]).replaceAll('&quot;', '"');
                const json = JSON.parse(decoded);
                if (json.fingerprint?.name) {
                    this.components[json.fingerprint.name] = {
                        fingerprint: json.fingerprint,
                        serverMemo: json.serverMemo,
                    };
                }
            } catch { }
        }

        this.updateCookies('cookies' in req ? req.cookies : req.headers.getSetCookie() || []);
    }

    private updateCookies(setCookieHeaders: string[]) {
        if (setCookieHeaders.length === 0) return;

        const newCookies = setCookieHeaders.map(c => c.split(';')[0]);
        const cookieMap = new Map<string, string>();

        for (const part of this.$cookie.split('; ')) {
            const [k, v] = part.split('=');
            if (k) cookieMap.set(k, v ?? '');
        }

        for (const cookie of newCookies) {
            const [k, v] = cookie.split('=');
            if (k) cookieMap.set(k, v ?? '');
        }

        this.$cookie = [...cookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }

    private randomId(len = 4) {
        return Math.random().toString(36).slice(2, 2 + len);
    }

    private async send(componentName: string, updates: any[]): Promise<any> {
        const comp = this.components[componentName];

        const body = {
            fingerprint: comp.fingerprint,
            serverMemo: comp.serverMemo,
            updates,
        };

        const req = await (this.mustByapssWaf ? wafFetch : fetch)(`https://${this.host}/livewire/message/${componentName}`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                'Cookie': this.$cookie,
                'Content-Type': 'application/json',
                'Accept': 'text/html, application/xhtml+xml',
                'X-CSRF-TOKEN': this.$csrfToken,
                'X-Livewire': 'true',
                'Origin': `https://${this.host}`,
                'Referer': `https://${this.host}/${comp.fingerprint.path}`.replace(/([^:])\/\/+/g, '$1/')
            }
        });

        this.updateCookies('cookies' in req ? req.cookies : req.headers.getSetCookie() || []);

        if (!req.ok) {
            const text = await req.text();
            console.error(`[LWMessage] fuck, HTTP ${req.status} for component "${componentName}"`, text);
            throw new Error(`livewire ${req.status} on ${componentName}`);
        }

        let response: any;
        try {
            response = await req.json();
        } catch (e) {
            const text = await req.clone().text();
            console.error(`[LWMessage] failed to parse response for "${componentName}"`, e, text);
            throw e;
        }

        if (response.serverMemo) this.components[componentName].serverMemo = {
            ...this.components[componentName].serverMemo,
            ...response.serverMemo,
            data: {
                ...this.components[componentName].serverMemo.data,
                ...(response.serverMemo.data ?? {}),
            }
        };

        return response;
    }

    async fireSingleEvent(component: string, event: string, params: any[] = []): Promise<any> {
        if (!this.components[component]) throw new Error(`component "${component}" not found — did pullHTML() run on the right page?`);

        return this.send(component, [{
            type: 'fireEvent',
            payload: { id: this.randomId(), event, params },
        }]);
    }

    queue: Record<string, { type: string; data: any; directParams?: any[] }[]> = {};

    queueFireEvent(component: string, event: string, params: any[] = []) {
        if (!this.components[component]) throw new Error(`component "${component}" not found — did pullHTML() run on the right page?`);

        if (!this.queue[component]) this.queue[component] = [];
        this.queue[component].push({ type: 'fireEvent', data: { id: this.randomId(), event, params } });
    }

    queueCallMethod(component: string, method: string, params: any[] = []) {
        if (!this.components[component]) throw new Error(`component "${component}" not found — did pullHTML() run on the right page?`);

        if (!this.queue[component]) this.queue[component] = [];
        this.queue[component].push({ type: 'callMethod', data: { id: this.randomId(), method, params } });
    }

    queueSyncInput(component: string, name: string, value: any) {
        if (!this.components[component]) throw new Error(`component "${component}" not found — did pullHTML() run on the right page?`);

        if (!this.queue[component]) this.queue[component] = [];
        this.queue[component].push({ type: 'syncInput', data: { id: this.randomId(), name, value } });
    }

    async sendQueue(component: string): Promise<any> {
        if (!this.components[component]) throw new Error(`component "${component}" not found — did pullHTML() run on the right page?`);
        if (!this.queue[component] || this.queue[component].length === 0) return;

        const updates = this.queue[component].map(({ type, data, directParams }) => directParams ? ({
            type,
            payload: data,
            directParams,
        }) : ({
            type,
            payload: data,
        }));

        this.queue[component] = [];
        return this.send(component, updates);
    }
}

export default LWMessage;