import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TerrainField} from '../src/world/terrain.js';
import {BIOME_IDS} from '../src/world/navigation.js';
import {renderedTerrainSurface} from '../src/rendering/terrain-surface.js';

const reference=process.argv[2]??'eb9857bf',output=process.argv[3];assert.ok(output,'Provide baseline revision and output path');
const source=execFileSync('git',['show',reference+':src/rendering/terrain-surface.js'],{encoding:'utf8'});
const {renderedTerrainSurface:before}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const points=Array.from({length:1200},(_,i)=>[(i%61-30)*1.375,(i%47-23)*1.625]);
const rows=[],checks=[];let checksum=0;
for(const biome of Object.values(BIOME_IDS)){
 const config={seed:'712',biome,relief:1,density:1,river:true},field=new TerrainField(config),native=field.surface.bind(field);let calls=0;
 field.surface=(x,z)=>{calls++;return native(x,z);};
 const a=points.map(([x,z])=>before(field,x,z)),b=points.map(([x,z])=>renderedTerrainSurface(field,x,z));assert.deepEqual(b,a);
 checks.push({biome,points:points.length,exact:true});
 for(let iteration=-2;iteration<12;iteration++)for(const [mode,sample] of iteration%2?[['candidate',renderedTerrainSurface],['reference',before]]:[['reference',before],['candidate',renderedTerrainSurface]]){
  calls=0;const started=performance.now();let sum=0;
  for(let repeat=0;repeat<10;repeat++)for(const [x,z] of points)sum+=sample(field,x,z);
  const ms=performance.now()-started;checksum+=sum;
  assert.equal(calls,points.length*10*(mode==='candidate'?3:4));
  if(iteration>=0)rows.push({biome,iteration,mode,ms,queries:calls,sum});
 }
}
const median=values=>{const sorted=values.toSorted((a,b)=>a-b),mid=sorted.length/2;return (sorted[Math.floor(mid)]+sorted[Math.ceil(mid)-1])/2;};
const summary=Object.fromEntries(Object.values(BIOME_IDS).map(biome=>[biome,Object.fromEntries(['reference','candidate'].map(mode=>[mode,{medianMs:median(rows.filter(r=>r.biome===biome&&r.mode===mode).map(r=>r.ms))}]))]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
writeFileSync(output,JSON.stringify({reference,baselineSourceSha256:sha(source),candidateSourceSha256:sha(readFileSync('src/rendering/terrain-surface.js')),warmupPairs:2,measuredPairs:12,queriesPerBatch:12000,checks,summary,checksum,rows,scope:'CPU-only exact native terrain queries, warm lattice cache, six biomes/seed712, alternating pairs. Query counter wraps both arms. Four long-running campaigns remain active. Not GPU, integrated frametime, memory or mobile evidence.'},null,2)+'\n');
console.log(JSON.stringify(summary));
