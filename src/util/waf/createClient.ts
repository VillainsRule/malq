import http2, { ClientHttp2Session } from 'node:http2';
import net from 'node:net';
import tls, { TLSSocket } from 'node:tls';

const createProxyTunnel = (origin: string): Promise<TLSSocket> => {
    return new Promise((resolve, reject) => {
        const proxyUrl = new URL(process.env.PROXY!);
        const targetUrl = new URL(origin);
        const isHttpsProxy = proxyUrl.protocol === 'https:';

        const createProxySocket = (): tls.TLSSocket | net.Socket => {
            if (isHttpsProxy) {
                return tls.connect({
                    host: proxyUrl.hostname,
                    port: parseInt(proxyUrl.port) || 443,
                    rejectUnauthorized: false,
                    checkServerIdentity: () => undefined,
                    servername: proxyUrl.hostname,
                });
            } else {
                return net.connect({
                    host: proxyUrl.hostname,
                    port: parseInt(proxyUrl.port) || 80,
                });
            }
        };

        const proxySocket = createProxySocket();

        proxySocket.on('connect', () => {
            if (process.env.DEBUG) console.log('connected to proxy');

            const connectRequest = [
                `CONNECT ${targetUrl.hostname}:${targetUrl.port || 443} HTTP/1.1`,
                `Host: ${targetUrl.hostname}:${targetUrl.port || 443}`,
            ];

            if (proxyUrl.username && proxyUrl.password) {
                const auth = Buffer.from(
                    `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`
                ).toString('base64');
                connectRequest.push(`Proxy-Authorization: Basic ${auth}`);
            }

            connectRequest.push('', '');
            proxySocket.write(connectRequest.join('\r\n'));
        });

        let responseData = '';

        const onData = (data: Buffer): void => {
            responseData += data.toString();

            if (responseData.includes('\r\n\r\n')) {
                const statusLine = responseData.split('\r\n')[0];
                const statusCode = parseInt(statusLine.split(' ')[1]);

                if (statusCode === 200) {
                    if (process.env.DEBUG) console.log('proxy tunnel established to', targetUrl.hostname);
                    proxySocket.removeListener('data', onData);

                    const tlsSocket = tls.connect({
                        socket: proxySocket,
                        servername: targetUrl.hostname,
                        rejectUnauthorized: false,
                        checkServerIdentity: () => undefined,
                        ALPNProtocols: ['h2', 'http/1.1'],
                        ciphers: [
                            'TLS_AES_128_GCM_SHA256',
                            'TLS_AES_256_GCM_SHA384',
                            'TLS_CHACHA20_POLY1305_SHA256',
                            'ECDHE-ECDSA-AES128-GCM-SHA256',
                            'ECDHE-RSA-AES128-GCM-SHA256',
                            'ECDHE-ECDSA-AES256-GCM-SHA384',
                            'ECDHE-RSA-AES256-GCM-SHA384',
                            'ECDHE-ECDSA-CHACHA20-POLY1305',
                            'ECDHE-RSA-CHACHA20-POLY1305',
                            'ECDHE-RSA-AES128-SHA',
                            'ECDHE-RSA-AES256-SHA',
                            'AES128-GCM-SHA256',
                            'AES256-GCM-SHA384',
                            'AES128-SHA',
                            'AES256-SHA',
                        ].join(':'),
                        sigalgs: 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512',
                        minVersion: 'TLSv1.2',
                        ecdhCurve: 'X25519:P-256:P-384',
                    });

                    tlsSocket.on('secureConnect', () => {
                        if (process.env.DEBUG) console.log('TLS handshake complete, ALPN:', tlsSocket.alpnProtocol);
                        resolve(tlsSocket);
                    });

                    tlsSocket.on('error', (err: Error) => {
                        console.error('TLS error:', err);
                        reject(err);
                    });
                } else {
                    proxySocket.destroy();
                    reject(new Error(`Proxy CONNECT failed with status ${statusCode}`));
                }
            }
        };

        proxySocket.on('data', onData);

        proxySocket.on('error', (err: Error) => {
            console.error('proxy error', err);
            reject(err);
        });
    });
};

const createClient = async (origin: string): Promise<ClientHttp2Session> => {
    if (!process.env.PROXY) return http2.connect(origin);

    try {
        const socket = await createProxyTunnel(origin);
        return http2.connect(origin, { createConnection: () => socket });
    } catch (error) {
        console.error('failed to create client with proxy:', error);
        throw error;
    }
};

export default createClient;