import fs from 'node:fs';
import path from 'node:path';

const vectorList = fs.readdirSync(path.join(import.meta.dirname, '..', 'vectors')).filter(e => e.endsWith('.ts')).sort();

for (let i = 0; i < vectorList.length; i++) {
    const vectorPath = vectorList[i];
    console.log(`${vectorPath.split('.')[0]}:`);
    await import(`../vectors/${vectorPath}`);
    console.log('');
}