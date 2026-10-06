import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createOpeningWorld} from './check_opening.mjs';
import {chunkPropCandidates} from './experiments/prop-query-grid.mjs';
const worlds=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'].map(biome=>createOpeningWorld({biome}));
const queries=[];
for(const {nav,s} of worlds){const center=s.structures[0];for(let dz=-12;dz<=12;dz+=3)for(let dx=-12;dx<=12;dx+=3){const x=center.x+dx,z=center.z+dz;queries.push({chunk:nav.chunk(Math.floor((x+24)/48),Math.floor((z+24)/48)),x,z,reach:12.28,suppressed:nav.suppressed});}}
function flat(q){const result=[];for(const list of q.chunk.instances)for(const p of list)if(Math.hypot(p.x-q.x,p.z-q.z)<q.reach&&!q.suppressed.has(p.id))result.push(p);return result;}
function indexed(q){return chunkPropCandidates(q.chunk,q.x,q.z,q.reach).filter(({prop:p})=>Math.hypot(p.x-q.x,p.z-q.z)<q.reach&&!q.suppressed.has(p.id)).map(({prop})=>prop);}
function axis(q){const result=[];for(const list of q.chunk.instances)for(const p of list)if(Math.abs(p.x-q.x)<q.reach&&Math.abs(p.z-q.z)<q.reach&&Math.hypot(p.x-q.x,p.z-q.z)<q.reach&&!q.suppressed.has(p.id))result.push(p);return result;}
for(const q of queries){assert.deepEqual(indexed(q),flat(q));assert.deepEqual(axis(q),flat(q));}
let checksum=0;const run=fn=>{const start=performance.now();for(let repeat=0;repeat<5;repeat++)for(const q of queries)checksum+=fn(q).length;return performance.now()-start;};
for(let i=0;i<3;i++){run(flat);run(indexed);run(axis);}
const samples=[];for(let i=0;i<10;i++){const r={};for(const [key,fn] of i%2?[['axis',axis],['indexed',indexed],['flat',flat]]:[['flat',flat],['indexed',indexed],['axis',axis]])r[key]=run(fn);samples.push(r);}
const median=key=>{const values=samples.map(s=>s[key]).sort((a,b)=>a-b);return (values[4]+values[5])/2;};
console.log(JSON.stringify({queries:queries.length,repeats:5,checksum,medianMs:{flat:median('flat'),indexed:median('indexed'),axis:median('axis')},samples},null,2));
