import fs from 'node:fs';
import path from 'node:path';

const domains = fs.readFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), 'utf-8').split('\n');
const tooFew = domains.filter(e => e.startsWith('N ')).filter(e => e.includes('[1 domain]') || e.includes(' domains]'));

const replaceBrackets = (str: string, newContent: string) => str.replace(/\[.*?\]/, `[${newContent}]`);
const replaceParenthesis = (str: string, newContent: string) => str.replace(/\(.*?\)/, `(${newContent})`);

await Promise.all(tooFew.map(async (d) => {
    const i = domains.indexOf(d);
    const root = `https://${d.split(' ')[1]}`;
    try {
        const req = await fetch(`${root}/`, {
            signal: AbortSignal.timeout(10_000),
            tls: { rejectUnauthorized: false },
            headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36' }
        });
        if (req.status >= 200 && req.status < 300) {
            const body = (await req.text()).toLowerCase();
            if (body.includes('function cookieExists(name) {')) domains[i] = replaceParenthesis(d, 'laravel2');
            else if (body.includes('limit_error = ')) domains[i] = replaceParenthesis(d, 'laravel');
            else if (body.includes('wire:initial-data="')) domains[i] = replaceParenthesis(d, 'lwMessage');
            else if (body.includes('$wire.setDomain')) domains[i] = replaceParenthesis(d, 'lwUpdate');
            else if (body.includes('var gasmurl = ')) domains[i] = replaceParenthesis(d, 'surl');
            else if (body.includes('Just a moment...')) domains[i] = replaceBrackets(d, 'UAM');
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
            ].some(e => body.includes(e.toLowerCase()))) domains[i] = replaceBrackets(d, 'parked');
            else if (body.includes('Attention Required!')) domains[i] = replaceBrackets(d, 'WAF');
            else if (body.includes('/jschallenge/')) domains[i] = replaceBrackets(d, 'jschallenge');
            else if (body.includes('recaptchadiv')) domains[i] = replaceBrackets(d, 'recapwaf');
            else if (body.includes('One moment, please...')) domains[i] = replaceBrackets(d, 'infinitywaf');
        } else console.log(`${root}: [E] ${req.status}`);
    } catch (err: any) {
        if (err.name === 'TimeoutError') console.log(`${root}: [E] timeout`);
        else if (err.code === 'ENOTFOUND') domains[i] = replaceBrackets(d, 'NXDOMAIN');
        else if (err.code === 'ConnectionRefused') domains[i] = replaceBrackets(d, 'serverr');
        else if (err.code === 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR') domains[i] = replaceBrackets(d, 'serverr');
        else console.error(`${root}: unexpected error`, err);
    }
}));

fs.writeFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), domains.join('\n'), 'utf-8');