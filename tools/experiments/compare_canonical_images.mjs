import {readFile} from 'node:fs/promises';
const [originalPath,experimentalPath]=process.argv.slice(2);if(!originalPath||!experimentalPath)throw Error('Usage: node compare_canonical_images.mjs ORIGINAL EXPERIMENTAL');
const original=JSON.parse(await readFile(originalPath,'utf8')),experimental=JSON.parse(await readFile(experimentalPath,'utf8'));
if(original.backend!=='WebGPU real'||experimental.backend!=='WebGPU real'||original.models.length!==10||experimental.models.length!==10)throw Error('Incomplete WebGPU image results');
for(let i=0;i<original.models.length;i++){const a=original.models[i],b=experimental.models[i];if(!a.baselineSha256||a.name!==b.name||a.baselineSha256!==b.baselineSha256)throw Error('Image mismatch: '+a.name);}
console.log('All ten static baseline image SHA-256 hashes match.');
