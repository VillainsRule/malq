import fs from 'node:fs';
import path from 'node:path';

import type Provider from '../src/providers/Provider';

const providerDir = path.join(import.meta.dirname, '..', 'src', 'providers', 'impl');
const providerFiles = fs.readdirSync(providerDir).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
const providerSubdirs = fs.readdirSync(providerDir).filter((file) => fs.statSync(path.join(providerDir, file)).isDirectory());

for (const subdir of providerSubdirs) {
    const subdirPath = path.join(providerDir, subdir);
    const subdirFiles = fs.readdirSync(subdirPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of subdirFiles) providerFiles.push(path.join(subdir, file));
}

const providers: Map<string, { new(): Provider }> = new Map();

providerFiles.sort();

for (const providerFile of providerFiles) {
    if (providerFile.includes('_')) continue;

    const providerPath = path.join(providerDir, providerFile);
    const providerModule = await import(providerPath);
    providers.set(providerFile.replace('.ts', ''), providerModule.default);
}

const values = Array.from(providers.values());

for (let i = 0; i < values.length; i++) {
    try {
        const ProviderClass = values[i];
        const provider = new ProviderClass();
        console.log(`testing provider ${provider.constructor.name} (${i + 1}/${values.length})...`);

        const address = await provider.getAddress();
        console.log('got address', address);

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + Bun.env.RESEND_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: Bun.env.RESEND_SENDER_EMAIL,
                to: address,
                subject: 'good morning!!',
                html: '<p>how r u doing this morning?</p>'
            })
        });

        console.log('fetched resend', await res.json());

        let didGetTheMail = false;

        for (let i = 0; i < 5; i++) {
            if (i < 3) await new Promise((r) => setTimeout(r, 1500));
            else await new Promise((r) => setTimeout(r, 3000));

            const mail = await provider.getMail();
            if (mail.length >= 1) {
                console.log('it got the mail', mail);

                if (mail.length > 1) console.error('>1 in inbox');
                if (!mail[0].from.includes('newsletter')) console.error('mail sender mismatch');
                if (mail[0].to !== address) console.error('mail recipient mismatch');
                if (mail[0].subject !== 'good morning!!') console.error('mail subject mismatch');
                if (mail[0].date > (Date.now() + 1000) || mail[0].date < (Date.now() - 1000 * 60 * 5)) console.error('mail date mismatch');
                if (!mail[0].body.includes('how r u doing this morning?')) console.error('mail body mismatch');

                console.log('sent time:', new Date(mail[0].date).toLocaleTimeString());

                didGetTheMail = true;
                break;
            } else console.log(`no mail on try ${i + 1}/5 :<`)
        }

        if (!didGetTheMail) console.error(provider.constructor.name, 'might be broken :<')
        else console.log(`done with ${provider.constructor.name}, moving on...`);

        provider.destroy()
    } catch (e) {
        console.error(`well well WELL...the above provider errors. moving on i guess...`);
        console.error(e);
    }
}

console.log('all done!');
process.exit();