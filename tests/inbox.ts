import Provider from '../src/providers/impl/anonymmail.net'

const provider = new Provider();

console.log('using provider', provider.constructor.name);

const d = await provider.getDomains();
console.log(d);

const address = `xo${Math.random().toString(36).slice(2)}@${d[2]}`;

await provider.createInbox(address);

console.log('address:', address);

let sent = false;

setInterval(async () => {
    console.log('checking mail...');
    const mail = await provider.getMail(address);

    if (!sent) {
        sent = true;

        fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.RESEND_SENDER_EMAIL,
                to: [address],
                subject: `test email ${Math.random().toString(36).slice(2)} XO`,
                html: `<h1>test email</h1><p>random: ${Math.random().toString(36).slice(2)}</p><a href="https://www.google.com">google</a><p>done!</p>`
            })
        }).then(r => r.json()).then(console.log).catch(console.error);
    }

    console.log(mail);

    if (mail[0] && (mail[0].date > (Date.now() + 1000) || mail[0].date < (Date.now() - 1000 * 60 * 5))) {
        let offBy = mail[0].date - Date.now();
        let hours = offBy / (1000 * 60 * 60);
        console.log('mail date must be shifted by', hours);
    }
}, 3000);