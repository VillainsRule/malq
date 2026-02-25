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
                        ALPNProtocols: ['h2'],
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