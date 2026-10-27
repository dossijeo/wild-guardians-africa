import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='docs/qa/tree-atlas-refresh-20261026',manifest=JSON.parse(await fs.readFile(`${root}/candidate-manifest.json`,'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex'),inventory=[];
for(const [biome,species] of Object.entries(manifest.biomes))for(const entry of species)for(const phase of ['day','night']){
 const stem=`${root}/${biome}-${entry.slot}/${phase}-imagegen`,runtime=`${stem}-128.webp`,record=`${stem}-runtime.json`;
 const row={biome,slot:entry.slot,phase,runtime,status:'missing'};
 try{const audit=JSON.parse(await fs.readFile(record,'utf8')),bytes=await fs.readFile(runtime),input=await fs.readFile(audit.input);if(audit.biome!==biome||audit.slot!==entry.slot||audit.phase!==phase||audit.outputSha256!==sha(bytes)||audit.inputSha256!==sha(input)||audit.encoding!=='srgb-encoded-linear-premultiplied'||audit.transparentRgb!=='zero-exact-webp')throw Error('Stale or incompatible runtime audit');row.status='ready';row.sha256=sha(bytes);entry.runtimeSha256??={};entry.runtimeSha256[phase]=row.sha256;entry[phase]='/'+runtime;entry.prelitAlphaEncoding='srgb-encoded-linear-premultiplied';entry.viewResolution=128;entry.imagegen=true;}catch(error){if(error.code!=='ENOENT'){row.status='invalid';row.error=String(error);}}
 inventory.push(row);
}
const complete=inventory.every(x=>x.status==='ready');
await fs.writeFile(`${root}/imagegen-inventory.json`,JSON.stringify({complete,expected:inventory.length,ready:inventory.filter(x=>x.status==='ready').length,entries:inventory},null,2));
// Never publish a partial candidate manifest: it must not silently mix missing
// generated entries with older artwork. The production manifest is never edited.
if(complete)await fs.writeFile(`${root}/imagegen-manifest.json`,JSON.stringify(manifest,null,2));
else {try{await fs.unlink(`${root}/imagegen-manifest.json`);}catch(e){if(e.code!=='ENOENT')throw e;}}
console.log(JSON.stringify({complete,expected:inventory.length,ready:inventory.filter(x=>x.status==='ready').length,manifestPublished:complete}));
