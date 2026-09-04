import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';

const domains = fs.readFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), 'utf-8');

for (const domain of domains.split('\n').filter(line => line.startsWith('N '))) {
    const domainPart = domain.split(' ')[1];

    if (domain.includes('NXDOMAIN'))
        fetch('http://' + domainPart, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
            .then(() => console.error(`domain ${domainPart} unexpectedly resolved!`))
            .catch(() => { });

    if (domain.includes('serverr')) fetch('http://' + domainPart, { signal: AbortSignal.timeout(5000) })
        .then(async (res) => {
            if (res.status >= 200 && res.status < 300) {
                const body = (await res.text()).toLowerCase();
                if (
                    !body.includes('undergoing maintenance') &&
                    !body.includes('<title>maintenance</title>') &&
                    !body.includes('page under construction') &&
                    !body.includes('we\'ll be back soon') &&
                    !body.includes('<title>index of /</title>') &&
                    !body.includes('web server\'s default page') &&
                    !body.includes('<title>closed after') &&
                    !body.includes('service ferm') &&
                    !body.includes('/cgi-sys/defaultwebpage.cgi') &&
                    !res.url.includes('/cgi-sys/suspendedpage.cgi')
                ) return console.error(`domain ${domainPart} unexpectedly sent a valid code!`)
            }
        })
        .catch(() => { });

    if (domain.includes('timeout')) fetch('http://' + domainPart, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        .then((e) => console.error(`domain ${domainPart} unexpectedly responded!`, e))
        .catch((err) => {
            if (err.name !== 'AbortError' && err.name !== 'TimeoutError' && err.code !== 'ECONNRESET')
                console.error(`domain ${domainPart} had an unexpected error:`, err);
        });

    if (domain.includes('redirect')) fetch('http://' + domainPart, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })
        .then((res) => {
            if (res.status < 300 || res.status >= 400) console.error(`domain ${domainPart} did not redirect as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('parked')) fetch('https://www.' + domainPart + '/', { redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { 'user-agent': 'Mozilla/5.0 Chrome/144.0.0.0' } })
        .then(async (res) => ({ text: await res.text(), status: res.status, headers: res.headers }))
        .then(({ text, status, headers }) => {
            if (
                ![
                    'expir',
                    'parked',
                    '#101c36',
                    '#1a1f2e',
                    '#141f2e',
                    '/lander',
                    '?ch=1&js=',
                    'is for sale',
                    'afternic.com',
                    'cmVmPSZzdWJpZDE9',
                    'l.cdn-fileserver.com',
                    'Domain registered at',
                    'is available for sale',
                    'this domain is for sale',
                    '/domain-names/auctions/',
                    '<title>redirecting...</title>',
                    'aHR0cHM6Ly9kZXByZXNzaXZlbHkuY29tL2dvLz'
                ].some(e => text.toLowerCase().includes(e)) &&
                !(status.toString().startsWith('3') && [
                    'domains.atom.com',
                    'DropCatch.com',
                    'expireddomains.com'
                ].some(e => headers.get('location')?.includes(e))) &&
                text.toLowerCase() !== 'redirecting'
            ) {
                console.error(`domain ${domainPart} does not appear to be parked as expected!`);
                console.log(`body: "${text}"`)
            }
        })
        .catch((err) => {
            if (
                err.name !== 'TimeoutError' &&
                err.code !== 'ECONNRESET' &&
                err.code !== 'ConnectionRefused' &&
                err.code !== 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' &&
                err.code !== 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR' &&
                err.code !== 'CERT_HAS_EXPIRED'
            ) console.error(`domain ${domainPart} had an unexpected error:`, err)
        });

    if (domain.includes('blank')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000) })
        .then(res => res.text())
        .then((text) => {
            if (text.trim().length !== 0 && !text.includes('<title>Untitled</title>'))
                console.error(`domain ${domainPart} does not appear to be blank as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('UAM')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('Just a moment')) console.error(`domain ${domainPart} does not appear to be behind a UAM as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('WAF')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('Attention Required!')) console.error(`domain ${domainPart} does not appear to be behind a WAF as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('jschallenge')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('/jschallenge')) console.error(`domain ${domainPart} does not appear to be behind a js challenge as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('recapwaf')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('recaptchadiv')) console.error(`domain ${domainPart} does not appear to be behind a recaptcha WAF as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('infinitywaf')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('<title>One moment, please...</title>')) console.error(`domain ${domainPart} does not appear to be behind an infinity WAF as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err));

    if (domain.includes('seized')) dns.resolveNs(domainPart.split('.').slice(-2).join('.'), (err, addresses) => {
        if (err) return console.error('error fetching DNS records for', domainPart);

        if (!addresses.some(addr =>
            addr.endsWith('fbi.seized.gov') ||
            addr.endsWith('usssdomainseizure.com') ||
            addr.endsWith('seizedservers.com')
        )) console.error(`domain ${domainPart} is NOT seized as expected!`)
    });
}