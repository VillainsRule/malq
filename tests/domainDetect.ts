import fs from 'node:fs';
import path from 'node:path';

const domains = fs.readFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), 'utf-8').split('\n');
const tooFew = domains.filter(e => e.startsWith('N ')).filter(e => e.includes('[1 domain]') || e.includes(' domains]'));

tooFew.forEach(async (d) => {
    const root = `https://${d.split(' ')[1]}`;
    try {
        const req = await fetch(`${root}/`, { signal: AbortSignal.timeout(5000), tls: { rejectUnauthorized: false } });
        if (req.status >= 200 && req.status < 300) {
            const body = (await req.text()).toLowerCase();
            if (body.includes('function cookieExists(name) {')) console.log(`${root}: laravel`);
            else if (body.includes('limit_error = ')) console.log(`${root}: laravel`);
            else if (body.includes('wire:initial-data="')) console.log(`${root}: lwMessage`);
            else if (body.includes('wire:snapshot="')) console.log(`${root}: lwUpdate`);
            else if (body.includes('var gasmurl = ')) console.log(`${root}: surl`);
            else if (body.includes('Just a moment...')) console.log(`${root}: [E] UAM`);
            else if ([
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
                'domain registered at',
                'is available for sale',
                'this domain is for sale',
                '/domain-names/auctions/',
                '<title>redirecting...</title>',
                'aHR0cHM6Ly9kZXByZXNzaXZlbHkuY29tL2dvLz'
            ].some(e => body.includes(e.toLowerCase()))) console.log(`${root}: [E] parked`);
            else if (body.includes('Attention Required!')) console.log(`${root}: [E] WAF`);
            else if (body.includes('/jschallenge/')) console.log(`${root}: [E] jschallenge`);
            else if (body.includes('recaptchadiv')) console.log(`${root}: [E] recapwaf`);
            else if (body.includes('One moment, please...')) console.log(`${root}: [E] infinitywaf`);
        } else console.log(`${root}: [E] ${req.status}`);
    } catch (err: any) {
        if (err.name === 'TimeoutError') console.log(`${root}: [E] timeout`);
        else if (err.code === 'ENOTFOUND') console.log(`${root}: NXDOMAIN`);
        else if (err.code === 'ConnectionRefused') console.log(`${root}: serverr`);
        else if (err.code === 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR') console.log(`${root}: serverr`);
        else console.error(`${root}: unexpected error`, err);
    }
});