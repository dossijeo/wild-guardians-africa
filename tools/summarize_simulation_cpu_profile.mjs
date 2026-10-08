// Sampling diagnostic only: retain self time whose stack includes Game.tick.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
assert.ok(process.argv[2]&&process.argv[3],'Pass CPU profile and output JSON');
const profile=JSON.parse(readFileSync(process.argv[2],'utf8'));
const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
for(const n of profile.nodes)for(const child of n.children??[]){assert.ok(!parents.has(child));parents.set(child,n.id);}
const inside=new Map();
function tickStack(id){
 if(inside.has(id))return inside.get(id);
 const f=nodes.get(id).callFrame;
 const result=f.url.endsWith('/src/simulation/game.js')&&['tick','tickScoped'].includes(f.functionName)||parents.has(id)&&tickStack(parents.get(id));
 inside.set(id,!!result);return !!result;
}
assert.equal(profile.samples.length,profile.timeDeltas.length);
const rows=new Map();let retainedMicros=0,excludedMicros=0,retainedSamples=0;
for(let i=0;i<profile.samples.length;i++){
 const id=profile.samples[i],delta=profile.timeDeltas[i];assert.ok(Number.isFinite(delta)&&delta>=0);
 if(!tickStack(id)){excludedMicros+=delta;continue;}
 retainedMicros+=delta;retainedSamples++;
 const f=nodes.get(id).callFrame,key=JSON.stringify(f),r=rows.get(key)??{function:f.functionName,url:f.url,line:f.lineNumber+1,micros:0,samples:0};
 r.micros+=delta;r.samples++;rows.set(key,r);
}
const functions=[...rows.values()].sort((a,b)=>b.micros-a.micros);
assert.equal(functions.reduce((sum,r)=>sum+r.micros,0),retainedMicros);
const out={scope:'CPU self samples with Game.tick/tickScoped on stack. Excludes import/setup/checkpoint stacks and GC without a tick ancestor. Profiler overhead and concurrent process scheduling remain; not precise elapsed attribution, frame time, GPU or optimization acceptance.',retainedSamples,excludedSamples:profile.samples.length-retainedSamples,retainedMicros,excludedMicros,functions};
writeFileSync(process.argv[3],JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,functions:functions.slice(0,12)},null,2));
