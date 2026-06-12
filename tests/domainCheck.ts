import fs from 'node:fs';
import path from 'node:path';

const domains = fs.readFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), 'utf-8').split('\n').filter(line => line.startsWith('N '));

for (const domain of domains) {
    const domainPart = domain.split(' ')[1];

    if (domain.includes('NXDOMAIN'))
        fetch('http://' + domainPart, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
            .then(() => console.error(`domain ${domainPart} unexpectedly resolved!`))
            .catch(() => console.log(`domain ${domainPart} expectedly did not resolve.`));

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
                if (err.name === 'TimeoutError' || err.code === 'ECONNRESET' || err.code === 'ConnectionRefused' || err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') console.log(`domain ${domainPart} expectedly timed out (parkeds are unreliable)`);
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
}