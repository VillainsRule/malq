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

    if (domain.includes('timeout')) fetch('http://' + domainPart, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'referer': 'https://www.google.com/',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'
        }
    })
        .then((e) => e && console.error(`domain ${domainPart} unexpectedly responded!`, e.status))
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
        .then(async (res) => {
            if (res.status < 300 || res.status >= 400) console.error(`domain ${domainPart} did not redirect as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err.name ?? err));

    if (domain.includes('parked')) fetch('https://' + domainPart + '/', {
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9'
        },
        tls: { rejectUnauthorized: false }
    })
        .then(async (res) => ({ text: await res.text(), status: res.status, headers: res.headers }))
        .then(({ text, status, headers }) => {
            if (
                ![
                    'parked',
                    '#101c36',
                    '#1a1f2e',
                    '#141f2e',
                    '/lander',
                    '?ch=1&js=',
                    'is for sale',
                    'afternic.com',
                    'may be for sale',
                    'cmVmPSZzdWJpZDE9',
                    'l.cdn-fileserver.com',
                    'domain registered at',
                    'domains.domainname.ru',
                    'is available for sale',
                    'park.101datacenter.net',
                    'Your domain is expired',
                    'this domain is for sale',
                    '/domain-names/auctions/',
                    'No advertisers available',
                    'premiumbusinessdomains.com',
                    'looks like the page is lost',
                    '<title>redirecting...</title>',
                    'aHR0cHM6Ly9pc3RvZC5jb20va3huci',
                    'aHR0cHM6Ly9kZXByZXNzaXZlbHkuY29tL2dvLz',
                ].some(e => text.toLowerCase().includes(e.toLowerCase())) &&
                !(status.toString().startsWith('3') && [
                    'domains.atom.com',
                    'DropCatch.com',
                    'expireddomains.com',
                    'whc.ca/domain-names',
                    'namegarage.com',
                    'daaz.com/lander',
                    'hugedomains.com',
                    'parking.onamae.com'
                ].some(e => headers.get('location')?.includes(e))) &&
                !(status.toString().startsWith('3') && headers.get('location')?.match(/(ww[0-9]{2}\.)/)?.[1]) &&
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
                err.code !== 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR'
            ) console.error(`domain ${domainPart} had an unexpected error:`, err.name ?? err)
        });

    if (domain.includes('UAM')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('Just a moment') && !text.includes('Performing security verification') && !text.includes('Checking your browser...'))
                console.error(`domain ${domainPart} does not appear to be behind a UAM as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err.name ?? err));

    if (domain.includes('WAF')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('Attention Required!')) console.error(`domain ${domainPart} does not appear to be behind a WAF as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err.name ?? err));

    if (domain.includes('jschallenge')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('/jschallenge')) console.error(`domain ${domainPart} does not appear to be behind a js challenge as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err.name ?? err));

    if (domain.includes('recapwaf')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('recaptchadiv')) console.error(`domain ${domainPart} does not appear to be behind a recaptcha WAF as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err.name ?? err));

    if (domain.includes('infinitywaf')) fetch('http://' + domainPart, { method: 'GET', signal: AbortSignal.timeout(5000), proxy: Bun.env.PROXY })
        .then(res => res.text())
        .then((text) => {
            if (!text.includes('<title>One moment, please...</title>')) console.error(`domain ${domainPart} does not appear to be behind an infinity WAF as expected!`);
        })
        .catch((err) => console.error(`domain ${domainPart} had an unexpected error:`, err.name ?? err));

    if (domain.includes('seized')) dns.resolveNs(domainPart.split('.').slice(-2).join('.'), (err, addresses) => {
        if (err) return console.error('error fetching DNS records for', domainPart);

        if (!addresses.some(addr =>
            addr.endsWith('fbi.seized.gov') ||
            addr.endsWith('usssdomainseizure.com') ||
            addr.endsWith('seizedservers.com')
        )) console.error(`domain ${domainPart} is NOT seized as expected!`)
    });
}