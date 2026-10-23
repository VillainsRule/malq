import fs from 'fs';
import os from 'os';
import path from 'path';

import CDP from './client';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Page {
    constructor(private cdp: CDP, private sessionId: string) { }

    evaluate = async <T = any>(expression: string): Promise<T | undefined> => {
        try {
            const res = await this.cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, this.sessionId);
            return res.result?.value;
        } catch {
            return undefined;
        }
    };

    html = async () => (await this.evaluate<string>('document.documentElement.outerHTML')) ?? '';

    goto = async (url: string) => {
        await this.cdp.send('Page.navigate', { url }, this.sessionId);
        await sleep(300);
        while (await this.evaluate<string>('document.readyState') !== 'complete') await sleep(200);
    };

    waitFor = async (check: (html: string) => boolean, timeout = 120000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const html = await this.html();
            if (html && check(html)) return html;
            await sleep(500);
        }
        throw new Error('waitFor timed out');
    };

    private mouse = { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };

    private dispatch = (type: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
        this.cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'none', ...extra }, this.sessionId);

    move = async (x: number, y: number) => {
        const { x: sx, y: sy } = this.mouse;
        const dist = Math.hypot(x - sx, y - sy);
        const steps = Math.max(8, Math.round(dist / 12));
        const c1 = { x: sx + (x - sx) * 0.3 + (Math.random() - 0.5) * dist * 0.3, y: sy + (y - sy) * 0.3 + (Math.random() - 0.5) * dist * 0.3 };
        const c2 = { x: sx + (x - sx) * 0.7 + (Math.random() - 0.5) * dist * 0.2, y: sy + (y - sy) * 0.7 + (Math.random() - 0.5) * dist * 0.2 };

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const u = 1 - e;
            const px = u ** 3 * sx + 3 * u * u * e * c1.x + 3 * u * e * e * c2.x + e ** 3 * x;
            const py = u ** 3 * sy + 3 * u * u * e * c1.y + 3 * u * e * e * c2.y + e ** 3 * y;
            await this.dispatch('mouseMoved', px, py);
            await sleep(8 + Math.random() * 14);
        }

        this.mouse = { x, y };
    };

    wander = async (moves = 4) => {
        for (let i = 0; i < moves; i++) {
            await this.move(80 + Math.random() * 1000, 80 + Math.random() * 600);
            await sleep(100 + Math.random() * 300);
        }
    };

    click = async (x: number, y: number) => {
        await this.move(x, y);
        await sleep(50 + Math.random() * 100);
        await this.dispatch('mousePressed', x, y, { button: 'left', clickCount: 1 });
        await sleep(40 + Math.random() * 80);
        await this.dispatch('mouseReleased', x, y, { button: 'left', clickCount: 1 });
    };

    cookies = async () => (await this.cdp.send<{ cookies: { name: string, value: string, domain: string }[] }>('Storage.getCookies')).cookies;
}

const closeFuncs = new Set<() => void>();

process.on('exit', () => {
    for (const fn of closeFuncs) fn();
});

export const launch = async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
    const portFile = path.join(dir, 'DevToolsActivePort');

    const proc = Bun.spawn([
        CHROME,
        `--user-data-dir=${dir}`,
        '--remote-debugging-port=0',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1280,900',
        'about:blank'
    ], { stdout: 'ignore', stderr: 'ignore' });

    while (!fs.existsSync(portFile) || fs.readFileSync(portFile, 'utf-8').split('\n').length < 2) await sleep(100);

    const [port, wsPath] = fs.readFileSync(portFile, 'utf-8').split('\n');
    const cdp = await CDP.connect(`ws://127.0.0.1:${port}${wsPath}`);

    const { targetInfos } = await cdp.send<{ targetInfos: { targetId: string, type: string }[] }>('Target.getTargets');
    const target = targetInfos.find((t) => t.type === 'page')!;
    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: target.targetId, flatten: true });

    const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });

    let closing = false;

    proc.exited.then(() => {
        cleanup();
        if (!closing) process.exit(1);
    });

    const close = async () => {
        closing = true;
        cdp.close();
        proc.kill();
        await proc.exited;
        closeFuncs.delete(close);
    };

    closeFuncs.add(close);

    return { cdp, page: new Page(cdp, sessionId), close };
};
