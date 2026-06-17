import Provider from '../src/providers/impl/laravel/expressinboxhub.com'

const provider = new Provider();

console.log('using provider', provider.constructor.name);
console.log(await provider.getAddress());

setInterval(async () => {
    console.log('checking mail...');
    const mail = await provider.getMail();
    console.log(mail);
    if (mail[0] && (mail[0].date > (Date.now() + 1000) || mail[0].date < (Date.now() - 1000 * 60 * 5))) console.error('mail date mismatch');
}, 3000);