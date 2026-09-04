fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        from: process.env.RESEND_SENDER_EMAIL,
        to: [decodeURIComponent(process.argv[2])],
        subject: `test email ${Math.random().toString(36).slice(2)} XO`,
        html: `<h1>test email</h1><p>random: ${Math.random().toString(36).slice(2)}</p><a href="https://www.google.com">google</a><p>done!</p>`
    })
}).then(r => r.json()).then(console.log).catch(console.error);