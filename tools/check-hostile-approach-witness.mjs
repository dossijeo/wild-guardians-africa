import fs from 'node:fs';import z from 'node:zlib';import {performance} from 'node:perf_hooks';import {createHash} from 'node:crypto';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
const mode=process.argv[2],out=process.argv[3];
if(!['baseline','candidate'].includes(mode)||!out)throw Error('Usage: node tools/check-hostile-approach-witness.mjs baseline|candidate fresh-output.json');
const raw=z.gunzipSync(fs.readFileSync(new URL('../docs/qa/hostile-approach-cache/normal-mid-query.json.gz',import.meta.url))),captured=JSON.parse(raw),state=structuredClone(captured.state);
const nav=new Navigation(state.seed,state.biome,JSON.parse(fs.readFileSync('public/content/biome-'+BIOME_IDS[state.biome]+'.json')).profile);nav.setState(state);
if(mode==='baseline')nav.approachPath=function(start,end,radius,margin){const reverse=this.path(end,start,radius,null,false,margin);return reverse?[...reverse.slice(0,-1).reverse(),{x:end.x,z:end.z}]:null;};
const origin=captured.animal,radius=origin.radius,plants=state.plants.filter(p=>p.alive).sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z)).slice(0,8),results=[];
const before=JSON.stringify(state),total=performance.now();
for(const focus of plants){
 const angle=Math.atan2(origin.x-focus.x,origin.z-focus.z),reach=.6+radius;
 for(let sample=0;sample<32;sample++){
  const offset=sample===0?0:(sample%2?1:-1)*Math.ceil(sample/2)*Math.PI/16;
  const point={x:focus.x+Math.sin(angle+offset)*reach,z:focus.z+Math.cos(angle+offset)*reach},at=performance.now(),route=nav.approachPath(origin,point,radius,32);
  results.push({plant:focus.id,sample,point,ms:performance.now()-at,hash:createHash('sha256').update(JSON.stringify(route)).digest('hex'),points:route?.length??null});
  if(sample%8===0)await new Promise(r=>setImmediate(r));
 }
 console.log(JSON.stringify({mode,plant:focus.id,queries:results.length,ms:performance.now()-total}));
}
const sourceHashes=Object.fromEntries(['src/world/navigation.js','src/world/approach-failure-warmth.js','tools/check-hostile-approach-witness.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const report={mode,scope:'Isolated first eight distance-sorted living crops, all 32 native approach angles; immutable mid-tick snapshot, not a resumable campaign checkpoint',snapshotHash:createHash('sha256').update(raw).digest('hex'),sourceHashes,ms:performance.now()-total,unchanged:before===JSON.stringify(state),heap:process.memoryUsage(),results};
if(!report.unchanged)throw Error('State changed');fs.writeFileSync(out,JSON.stringify(report),{flag:'wx'});
