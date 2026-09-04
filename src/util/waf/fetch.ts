import http2 from 'node:http2';
import createClient from './createClient';

interface WafFetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    referrer?: string;
    noProxy?: boolean;
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

export const chromeVersion = await (await fetch('https://files.villainsrule.xyz/chromeVersion.txt')).json();

const wafFetch = (inputUrl: string, options: WafFetchOptions = {}): Promise<WafFetchResponse> =>
    new Promise(async (resolve, reject) => {
        const url = new URL(inputUrl);
        const client = options.noProxy ? http2.connect(url.origin) : await createClient(url.origin);

        const method = (options.method ?? 'GET').toUpperCase();

        const defaultHeaders: Record<string, string> = {
            ':method': method,
            ':authority': url.host,
            ':scheme': url.protocol.replace(':', ''),
            ':path': url.pathname + url.search,
            'sec-ch-ua': `"Chromium";v="${chromeVersion}", "Not:A-Brand";v="24", "Google Chrome";v="${chromeVersion}"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'upgrade-insecure-requests': '1',
            'user-agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`,
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'sec-fetch-site': 'none',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-user': '?1',
            'sec-fetch-dest': 'document',
            // 'accept-encoding': 'deflate',
            'accept-language': 'en-US,en;q=0.9',
            'priority': 'u=0, i',
            ...(options.headers?.referer ? { referer: options.headers.referer } : { referer: url.origin }),
            ...(options.headers?.origin ? { origin: options.headers.origin } : { origin: url.origin })
        };

        const { body = null } = options;

        if (body) {
            defaultHeaders['content-length'] = Buffer.byteLength(body).toString();
            defaultHeaders['content-type'] ??= 'application/x-www-form-urlencoded';
        }

        const userHeaders = Object.fromEntries(
            Object.entries(options.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
        );

        const headers: Record<string, string> = { ...defaultHeaders, ...userHeaders };

        const req = client.request(headers);

        let responseHeaders: Record<string, string | string[]> = {};
        let responseBody = '';

        req.on('response', (resHeaders: Record<string, string | string[]>) => {
            responseHeaders = resHeaders;
        });

        req.setEncoding('utf8');

        req.on('data', (chunk: string) => {
            responseBody += chunk;
        });

        req.on('end', () => {
            client.close();

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

        req.on('error', reject);

        if (body) req.write(body);
        req.end();
    });

export default wafFetch;