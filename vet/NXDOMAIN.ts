import { execSync } from 'child_process';

const domains = execSync('pbpaste', { encoding: 'utf8' }).split(', ');

let lastSChar = '';

function runCommand(cmd: string) {
    try {
        return execSync(cmd, { encoding: 'utf8' });
    } catch (error: any) {
        return error.stdout || error.stderr;
    }
}

domains.forEach((e) => {
    const nslookup = runCommand(`nslookup ${e} 1.1.1.1`);
    if (nslookup.includes('NXDOMAIN') || nslookup.includes('No answer') || nslookup.includes('SERVFAIL')) {
        domains.splice(domains.indexOf(e), 1);
        if (lastSChar !== e.charAt(0)) {
            console.log('');
            lastSChar = e.charAt(0);
        }
        console.log(`N ${e} [NXDOMAIN]`);
    }
});

console.log(`\n\nremaining domains: ${domains.join(', ')}`)