// Runtime impostor atlases only; retain prelit alpha metadata for later validation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {assetUrl} from '../../src/rendering/asset-url.js';

const output=process.argv[2]??'.cache/ktx2-fixture/far-batch.json',manifest=JSON.parse(await readFile('public/content/far-vegetation.json','utf8')),items=new Map();
for(const [biome,species] of Object.entries(manifest.biomes??{}))for(const metadata of species)for(const lighting of ['day','night']){
 const url=metadata[lighting];if(typeof url!=='string')throw Error(`Missing ${biome}:${metadata.slot}:${lighting}`);
 const resolved=assetUrl('/'+url.replace(/^\.\//,''));if(!resolved.startsWith('/assets/far-vegetation/')||resolved.includes('..'))throw Error('Unexpected atlas source: '+resolved);
 const source='public'+resolved,sha256=createHash('sha256').update(await readFile(source)).digest('hex');
 if(metadata.runtimeSha256?.[lighting]&&metadata.runtimeSha256[lighting]!==sha256)throw Error('Stale atlas hash: '+source);
 const entry=items.get(source)??{source,kind:'color',uses:[]};entry.uses.push({biome,slot:metadata.slot,lighting,alphaEncoding:metadata.prelitAlphaEncoding??'unspecified',sourceSha256:sha256});items.set(source,entry);
}
const records=[...items.values()].sort((a,b)=>a.source.localeCompare(b.source));await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({records,scope:'Impostor day/night atlases listed by the runtime far vegetation manifest. Premultiplied alpha, atlas boundaries and mip levels require visual validation before use.'},null,2)+'\n');console.log(JSON.stringify({output,records:records.length,uses:records.reduce((n,r)=>n+r.uses.length,0)}));
