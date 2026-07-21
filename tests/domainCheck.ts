import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';

const domains = fs.readFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), 'utf-8');

for (const domain of domains.split('\n').filter(line => line.startsWith('N '))) {
    const domainPart = domain.split(' ')[1];

    if (domain.includes('NXDOMAIN'))
        fetch('http://' + domainPart, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
            .then(() => console.error(`domain ${domainPart} unexpectedly resolved!`))
            .catch(() => console.log(`domain ${domainPart} expectedly did not resolve.`));

    if (domain.includes('serverr'))
        fetch('http://' + domainPart, { signal: AbortSignal.timeout(5000) })
            .then(async (res) => {
                if (res.status >= 200 && res.status < 300) {
                    const body = await res.text();
                    if (!body.includes('undergoing maintenance') && !body.includes('<title>Account Suspended</title>') && !body.includes('<title>Index of /</title>'))
                        return console.error(`domain ${domainPart} unexpectedly sent a valid code!`)
                }

                console.log(`domain ${domainPart} expectedly errored.`)
            })
            .catch(() => console.log(`domain ${domainPart} expectedly errored.`));

    if (domain.includes('blank'))
        fetch('http://' + domainPart, { signal: AbortSignal.timeout(5000) })
            .then(async (res) => {
                const body = await res.text();
                if (body.trim() === '') console.log(`domain ${domainPart} is expectedly blank`);
                else console.error(`domain ${domainPart} is NOT blank!`)
            })
            .catch(() => console.error(`domain ${domainPart} is not blank!`));

    if (domain.includes('timeout'))
        fetch('http://' + domainPart, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
            .then((e) => console.error(`domain ${domainPart} unexpectedly responded!`, e))
            .catch((err) => {
                if (err.name === 'AbortError' || err.name === 'TimeoutError') console.log(`domain ${domainPart} expectedly timed out.`);
                else console.error(`domain ${domainPart} had an unexpected error:`, err);
            });

    if (domain.includes('redirect'))
        fetch('http://' + domainPart, { method: 'HEAD', signal: AbortSignal.timeout(5000), redirect: 'manual' })
            .then((res) => {
                if (res.status >= 300 && res.status < 400) console.log(`domain ${domainPart} expectedly redirected`);
                else console.error(`domain ${domainPart} did not redirect as expected!`);
            })
            .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('parked'))
        fetch('https://' + domainPart + '/', { redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { 'user-agent': 'Mozilla/5.0 Chrome/144.0.0.0' } })
            .then(async (res) => ({ text: await res.text(), status: res.status, headers: res.headers }))
            .then(({ text, status, headers }) => {
                if ([
                    'parked',
                    'expir',
                    '#101c36',
                    '/lander',
                    'afternic.com',
                    '<title>redirecting...</title>'
                ].some(e => text.toLowerCase().includes(e))) console.log(`domain ${domainPart} expectedly appears to be parked.`);
                else if (status.toString().startsWith('3') && headers.get('location')?.includes('DropCatch.com')) console.log(`domain ${domainPart} expectedly appears to be parked (via DropCatch)!`);
                else console.error(`domain ${domainPart} does not appear to be parked as expected!`);
            })
            .catch((err) => {
                if (
                    err.name === 'TimeoutError' ||
                    err.code === 'ECONNRESET' ||
                    err.code === 'ConnectionRefused' ||
                    err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
                    err.code === 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR'
                ) console.log(`domain ${domainPart} expectedly timed out (parkeds are unreliable)`);
                else console.error(`domain ${domainPart} had an unexpected error:`, err)
            });

    if (domain.includes('blank'))
        fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000) })
            .then(res => res.text())
            .then((text) => {
                if (text.trim().length === 0) console.log(`domain ${domainPart} expectedly appears to be blank.`);
                else console.error(`domain ${domainPart} does not appear to be blank as expected!`);
            })
            .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('UAM'))
        fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
            .then(res => res.text())
            .then((text) => {
                if (text.includes('Just a moment')) console.log(`domain ${domainPart} expectedly appears to be behind a UAM.`);
                else console.error(`domain ${domainPart} does not appear to be behind a UAM as expected!`);
            })
            .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('WAF'))
        fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
            .then(res => res.text())
            .then((text) => {
                if (text.includes('Attention Required!')) console.log(`domain ${domainPart} expectedly appears to be behind a WAF.`);
                else console.error(`domain ${domainPart} does not appear to be behind a WAF as expected!`);
            })
            .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('jschallenge'))
        fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
            .then(res => res.text())
            .then((text) => {
                if (text.includes('/jschallenge')) console.log(`domain ${domainPart} expectedly appears to be behind a js challenge.`);
                else console.error(`domain ${domainPart} does not appear to be behind a js challenge as expected!`);
            })
            .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('recapwaf'))
        fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
            .then(res => res.text())
            .then((text) => {
                if (text.includes('recaptchadiv')) console.log(`domain ${domainPart} expectedly appears to be behind a recaptcha WAF.`);
                else console.error(`domain ${domainPart} does not appear to be behind a recaptcha WAF as expected!`);
            })
            .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('seized')) dns.resolveNs(domainPart.split('.').slice(-2).join('.'), (err, addresses) => {
        if (err) return console.error('error fetching DNS records for', domainPart);

        if (addresses.some(addr =>
            addr.endsWith('fbi.seized.gov') ||
            addr.endsWith('usssdomainseizure.com') ||
            addr.endsWith('seizedservers.com')
        )) console.log(`domain ${domainPart} is seized as expected (lol)`)
        else console.error(`domain ${domainPart} is NOT seized as expected!`)
    });
}

const impl = path.join(import.meta.dirname, '..', 'src', 'providers', 'impl');
const scan = new Bun.Glob('**/*.ts').scan(impl);
for await (const file of scan) {
    const filename = path.basename(file, '.ts');
    if (filename !== '_constructor' && !domains.includes(`Y ${filename.replaceAll('_', '-')}`))
        console.error(`implementation file ${filename} is missing from DOMAINS.md!`);
}