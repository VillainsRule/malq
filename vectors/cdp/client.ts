type Listener = (params: any, sessionId?: string) => void;

export default class CDP {
    private id = 0;
    private pending = new Map<number, { resolve: (v: any) => void, reject: (e: Error) => void }>();
    private listeners = new Map<string, Listener[]>();

    private constructor(private ws: WebSocket) {
        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data as string);

            if (msg.id !== undefined) {
                const p = this.pending.get(msg.id);
                if (!p) return;
                this.pending.delete(msg.id);
                if (msg.error) p.reject(new Error(`${msg.error.message} (${msg.error.code})`));
                else p.resolve(msg.result);
            } else this.listeners.get(msg.method)?.forEach((fn) => fn(msg.params, msg.sessionId));
        };

        ws.onclose = () => {
            this.pending.forEach((p) => p.reject(new Error('cdp socket closed')));
            this.pending.clear();
        };
    }

    static connect = (url: string) => new Promise<CDP>((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.onopen = () => resolve(new CDP(ws));
        ws.onerror = () => reject(new Error('cdp connect failed'));
    });

    send = <T = any>(method: string, params: Record<string, unknown> = {}, sessionId?: string) => new Promise<T>((resolve, reject) => {
        const id = ++this.id;
        this.pending.set(id, { resolve, reject });
        this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

    on = (event: string, fn: Listener) => {
        this.listeners.set(event, [...(this.listeners.get(event) ?? []), fn]);
    };

    close = () => this.ws.close();
}
