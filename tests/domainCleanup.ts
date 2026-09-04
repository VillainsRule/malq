import fs from 'node:fs';
import path from 'node:path';

const domains = fs.readFileSync(path.join(import.meta.dirname, '..', 'DOMAINS.md'), 'utf-8').split('\n');

const impl = path.join(import.meta.dirname, '..', 'src', 'providers', 'impl');
const scan = Array.from(new Bun.Glob('**/*.ts').scanSync(impl));
for (const file of scan) {
    const filename = path.basename(file, '.ts');
    if (filename !== '_constructor' && !domains.includes(`Y ${filename.replaceAll('_', '-')}`))
        console.error(`implementation file ${filename} is missing from DOMAINS.md!`);
}

const y = domains.filter(e => e.startsWith('Y '));
const n = domains.filter(e => e.startsWith('N '));

y.forEach((i) => {
    const o = n.some(x => x.split(' ')[1] === i.split(' ')[1]);
    if (o) console.warn(`${i.split(' ')[1]} appears in both Y and N!`);

    if (!scan.some(f => f.split('/').pop() === i.split(' ')[1] + '.ts'))
        console.warn(`${i} does not appear in domains list`);
});

const signals = domains.filter(e => e.startsWith('- ')).map(e => e.match(/- (\[C\] )?(.*?): /)?.[2]).filter(e => e);
domains.forEach((d) => {
    const s = d?.match(/\[(.*?)\]/)?.[1];
    if (s && !signals.includes(s) && !/^[0-5] domain(s?)$/.test(s) && s !== 'C') console.warn(`unknown signal "${s}"`);
});