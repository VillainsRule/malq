import Provider from '../src/providers/impl/lwUpdate/temp-mail.asia.ts'

const provider = new Provider();

console.log('using provider', provider.constructor.name);
console.log(await provider.getAddress());

setInterval(async () => {
    console.log('checking mail...');
    const mail = await provider.getMail();
    console.log(mail);
}, 3000);