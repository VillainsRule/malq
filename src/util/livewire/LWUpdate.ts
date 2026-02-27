import wafFetch from '../waf/fetch';

class LWUpdate {
    host: string;
    mustByapssWaf: boolean;

    html: string = '';
    $cookie: string = '';
    $csrfToken: string = '';

    snapshots: Record<string, any> = {};

    constructor(host: string, mustBypassWaf = false) {
        this.host = host;
        this.mustByapssWaf = mustBypassWaf;
    }

    async pullHTML(customPath: string = '/') {
        const req = await (this.mustByapssWaf ? wafFetch : fetch)(`https://${this.host}${customPath}`, {
            headers: this.$cookie ? { 'Cookie': this.$cookie } : {}
        });

        const html = await req.text();

        this.html = html;
        this.$csrfToken = html.match(/data-csrf="(.*?)"/)?.[1] || '';

        const allSnapshots = html.matchAll(/wire:snapshot="(.*?)"/g);
        for (const snapshot of allSnapshots) {
            const realData = snapshot[1].split('"')[0];
            const decoded = decodeURIComponent(realData).replaceAll('&quot;', '"');
            const json = JSON.parse(decoded);
            this.snapshots[json.memo.name] = json;
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

    cache: Record<string, { component: string, type: string, directParams?: any, data: object }[]> = {};
    updates: Record<string, any> = {};

    directCall(component: string, method: string, params: any[] = []) {
        if (!this.$csrfToken) throw new Error('csrfToken not found, did you call pullHTML() with a valid page?');
        if (!this.snapshots[component]) throw new Error(`component ${component} not found in snapshots`);

        if (!this.cache[component]) this.cache[component] = [];
        this.cache[component].push({ component, type: method, data: {}, directParams: params });
    }

    dispatch(component: string, type: string, data?: any) {
        if (!this.$csrfToken) throw new Error('csrfToken not found, did you call pullHTML() with a valid page?');
        if (!this.snapshots[component]) throw new Error(`component ${component} not found in snapshots`);

        if (!this.cache[component]) this.cache[component] = [];
        this.cache[component].push({ component, type, data: data || {} });
    }

    async sendoff() {
        if (Object.keys(this.cache).length === 0) return;

        const body = {
            _token: this.$csrfToken,
            components: Object.entries(this.cache).map(([component, calls]) => ({
                snapshot: JSON.stringify(this.snapshots[component]),
                updates: this.updates,
                calls: calls.map(({ type, data, directParams }) => directParams ? ({
                    path: '',
                    method: type,
                    params: directParams,
                }) : ({
                    path: '',
                    method: '__dispatch',
                    params: [type, data],
                    metadata: {}
                }))
            }))
        };

        this.cache = {};
        this.updates = {};

        const req = await (this.mustByapssWaf ? wafFetch : fetch)(`https://${this.host}/livewire/update`, {
            body: JSON.stringify(body),
            method: 'POST',
            headers: {
                'Cookie': this.$cookie,
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'X-Livewire': '1',
                'Referer': `https://${this.host}/mailbox`,
            }
        });

        this.updateCookies('cookies' in req ? req.cookies : req.headers.getSetCookie() || []);

        if (!req.ok) {
            const text = await req.text();
            console.error('livewire fuck up', req.status, text);
            throw new Error(`Livewire HTTP ${req.status}`);
        }

        try {
            const response = await req.json() as any;

            if (response.components) {
                response.components.forEach((comp: any) => {
                    if (comp.snapshot) {
                        const parsed = JSON.parse(comp.snapshot);
                        this.snapshots[parsed.memo.name] = parsed;
                    }
                });
            }

            return response;
        } catch (e) {
            const text = await req.clone().text();
            console.error('failed to parse livewire response', e, text);
            throw e;
        }
    }
}

export default LWUpdate;