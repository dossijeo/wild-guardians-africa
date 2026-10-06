import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2]&&process.argv[3],'Pass reference and candidate roots');
const {Navigation:Reference,BIOME_IDS}=await import(pathToFileURL(resolve(process.argv[2],'src/world/navigation.js')));
const {Navigation:Candidate}=await import(pathToFileURL(resolve(process.argv[3],'src/world/navigation.js')));
const solid=p=>p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18;
const rows=[];let queries=0;
for(const biome of Object.keys(BIOME_IDS)){
 const profile=JSON.parse(readFileSync(resolve(process.argv[2],`public/content/biome-${BIOME_IDS[biome]}.json`),'utf8')).profile;
 const a=new Reference(712,biome,profile),b=new Candidate(712,biome,profile);
 let allProps=0,solidProps=0;
 for(let i=0;i<24;i++)for(const radius of [4.28,5.1,12]){
  const x=(i-12)*3.125,z=(i%7-3)*8.375;
  const expected=a.propsAt(x,z,radius),original=expected.map(p=>p.id),filtered=expected.filter(solid).map(p=>p.id);
  assert.deepEqual(b.propsAt(x,z,radius).map(p=>p.id),original,'construction/default query remains complete and ordered');
  assert.deepEqual(b.propsAt(x,z,radius,true).map(p=>p.id),filtered,'movement subset matches every original solid prop in order');
  assert.deepEqual([...b.chunks.keys()],[...a.chunks.keys()],'same procedural chunk visits and cache order');
  allProps+=original.length;solidProps+=filtered.length;queries++;
 }
 rows.push({biome,queries:72,allProps,solidProps});
}
console.log(JSON.stringify({scope:'432 original procedural prop queries over six biome profiles and three radii. Default construction queries retain all ordered props; solid-only queries equal the original filtered subset. Chunk cache order is unchanged. This is not visual or gameplay acceptance.',queries,rows},null,2));
