import zlib from 'node:zlib';
import createClient from './createClient';

interface WafFetchOptions {
    method?: string;
    headers?: Record<string, string | undefined>;
    body?: string;
    referrer?: string;
    noProxy?: boolean;
    timeout?: number;
}

interface WafFetchResponse {
    ok: boolean;
    status: number;
    headers: Record<string, string | string[]>;
    cookies: string[];
    text: () => string;
    json: <T = unknown>() => T;
    clone: () => {
        text: () => string;
        json: <T = unknown>() => T;
    }
}

const zstd = (zlib as any).zstdDecompressSync as ((b: Buffer) => Buffer) | undefined;

const acceptEncoding = zstd ? 'gzip, deflate, br, zstd' : 'gzip, deflate, br';

const decode = (buf: Buffer, encoding: string) => {
    for (const enc of encoding.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).reverse()) {
        if (enc === 'gzip' || enc === 'x-gzip') buf = zlib.gunzipSync(buf);
        else if (enc === 'deflate') buf = zlib.inflateSync(buf);
        else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
        else if (enc === 'zstd' && zstd) buf = zstd(buf);
    }

    return buf;
};

export const chromeVersion = await (await fetch('https://files.villainsrule.xyz/chromeVersion.txt')).text();

const wafFetch = (inputUrl: string, options: WafFetchOptions = {}): Promise<WafFetchResponse> =>
    new Promise(async (resolve, reject) => {
        const url = new URL(inputUrl);

        const timeout = options.timeout ?? 5000;
        let timedOut = false;
        let client: Awaited<ReturnType<typeof createClient>> | undefined;

        const timer = setTimeout(() => {
            timedOut = true;
            client?.close();
            reject(new Error(`wafFetch timed out after ${timeout}ms: ${inputUrl}`));
        }, timeout);

        client = await createClient(url.origin, options.noProxy);

        if (timedOut) return client.close();

        const method = (options.method ?? 'GET').toUpperCase();

        const defaultHeaders: Record<string, string> = {
            ':method': method,
            ':authority': url.host,
            ':scheme': url.protocol.replace(':', ''),
            ':path': url.pathname + url.search,
            'cache-control': 'max-age=0',
            'upgrade-insecure-requests': '1',
            'user-agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`,
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-encoding': acceptEncoding,
            'accept-language': 'en-US,en;q=0.9',
            'priority': 'u=0, i',
            ...(options.headers?.referer ? { referer: options.headers.referer } : { referer: url.origin }),
            ...(options.headers?.origin ? { origin: options.headers.origin } : method === 'GET' || method === 'HEAD' ? {} : { origin: url.origin })
        };

        const { body = null } = options;

        if (body) {
            defaultHeaders['content-length'] = Buffer.byteLength(body).toString();
            defaultHeaders['content-type'] ??= 'application/x-www-form-urlencoded';
        }

        const userHeaders = Object.fromEntries(
            Object.entries(options.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
        );

        const headers: Record<string, string | undefined> = { ...defaultHeaders, ...userHeaders };

        Object.entries(headers).forEach(([k, v]) => {
            if (!v) delete headers[k];
        });

        const req = client.request(headers);

        let responseHeaders: Record<string, string | string[]> = {};
        let responseBody = '';

        req.on('response', (resHeaders: Record<string, string | string[]>) => {
            responseHeaders = resHeaders;
        });

        const chunks: Buffer[] = [];

        req.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });

        req.on('end', () => {
            clearTimeout(timer);
            client.close();

            try {
                responseBody = decode(Buffer.concat(chunks), String(responseHeaders['content-encoding'] ?? '')).toString('utf8');
            } catch (e) {
                return reject(e);
            }

            const status = Number(responseHeaders[':status'] ?? 200);
            const rawCookies = responseHeaders['set-cookie'];
            const cookies: string[] = Array.isArray(rawCookies)
                ? rawCookies
                : rawCookies
                    ? [rawCookies]
                    : [];

            resolve({
                ok: status >= 200 && status < 300,
                status,
                headers: responseHeaders,
                cookies,
                text: () => responseBody,
                json: <T = unknown>() => JSON.parse(responseBody) as T,
                clone: () => ({
                    text: () => responseBody,
                    json: <T = unknown>() => JSON.parse(responseBody) as T,
                }),
            });
        });

        req.on('error', (e) => {
            clearTimeout(timer);
            reject(e);
        });

        if (body) req.write(body);
        req.end();
    });

export default wafFetch;