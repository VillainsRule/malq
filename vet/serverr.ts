import { execSync } from 'child_process';

const domains = execSync('pbpaste', { encoding: 'utf8' }).trim().split(', ');

let bad: { domain: string, error: string }[] = [];

await Promise.all(domains.map(async (domain) => {
    try {
        const req = await fetch(`http://${domain}`, {
            tls: { rejectUnauthorized: false },
            signal: AbortSignal.timeout(10_000),
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9,hi;q=0.8',
                'origin': `https://${domain}`,
                'referer': `https://${domain}/`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
            }
        });
        if (req.status.toString().startsWith('5')) bad.push({ domain, error: 'serverr' });
        else if (req.status === 200 || req.status === 404) { }
        else console.log(domain, req.status, req.statusText);
    } catch (e: any) {
        if (e.code === 'ConnectionRefused') bad.push({ domain, error: 'serverr' });
        else if (e.name === 'TimeoutError') bad.push({ domain, error: 'timeout' });
        else console.log(domain, e.code || e);
    }
}));

let lastSChar = '';

bad.sort((a, b) => a.domain.localeCompare(b.domain)).forEach(({ domain, error }) => {
    domains.splice(domains.indexOf(domain), 1);
    if (lastSChar !== domain.charAt(0)) {
        console.log('');
        lastSChar = domain.charAt(0);
    }
    console.log(`N ${domain} [${error}]`);
})

console.log(`\n\nremaining domains: ${domains.join(', ')}`);