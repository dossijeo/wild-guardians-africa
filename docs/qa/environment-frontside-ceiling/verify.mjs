import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const read=name=>JSON.parse(readFileSync(join(dir,name),'utf8'));
for(const entry of read('receipt.json').files){const bytes=readFileSync(join(dir,entry.name));assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);}
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,median:(s[(s.length-1)>>1]+s[s.length>>1])/2,p95:s[Math.ceil(s.length*.95)-1]};};
let queries=0;
for(const biome of ['sabana','manglares']){
 const r=read(biome+'-original-report.json'),ready=read(biome+'-ready.json'),closed=read(biome+'-cleanup.json'),logs=read(biome+'-console.json');
 assert.equal(r.biome,biome);assert.equal(r.completed,true);assert.equal(r.restored,true);assert.deepEqual(r.errors,[]);assert.equal(r.glError,0);
 assert.deepEqual(r.context,ready.context);assert.deepEqual(r.context.buffer,[1280,720]);assert.equal(r.context.seed,712);assert.equal(r.context.time,120);
 assert.deepEqual(r.blocks.map(b=>b.arm),[...'ABBABAAB']);
 assert.equal(closed.disposed,true);assert.equal(closed.contextLost,true);assert.equal(closed.restored,true);assert.deepEqual(closed.blocks,r.blocks);
 assert(logs.every(l=>l.level!=='error'));
 for(const view of ['overview','near','opposite']){const a=read(biome+'-'+view+'-double.json'),b=read(biome+'-'+view+'-front.json');assert.equal(a.visualArm,'DoubleSide');assert.equal(b.visualArm,'FrontSide');assert.deepEqual(a.visualCamera,b.visualCamera);assert.deepEqual(a.visualTarget,b.visualTarget);assert.equal(a.context.sourceLogicalSha256,b.context.sourceLogicalSha256);assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);}
 const visualCleanup=read(biome+'-visual-cleanup.json');assert.equal(visualCleanup.disposed,true);assert.equal(visualCleanup.contextLost,true);assert(read(biome+'-visual-console.json').every(l=>l.level!=='error'));
 for(const w of r.witnesses){assert(w.draws.some(d=>d.pass==='color'));assert(w.draws.some(d=>d.pass==='shadow'));for(const d of w.draws){assert.equal(d.cull,w.arm==='B');assert.equal(d.side,w.arm==='B'?0:2);if(w.arm==='B'){assert.equal(d.cullMode,1029);assert.equal(d.frontFace,2305);}}}
 for(const b of r.blocks){assert.equal(b.shadowCalls,60);assert(b.proxyTouched>0);for(const [pass,g] of Object.entries(b.gpu)){assert.equal(g.supported,true);assert.equal(g.pending,0);for(const key of ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose'])assert.equal(g[key]??0,0);assert.equal(g.samples.length,pass==='depth'?30:60);assert(g.samples.every(s=>Number.isFinite(s.ms)&&s.ms>=0));assert.deepEqual(stats(g.samples.map(s=>s.ms)),b.summaries[pass]);queries+=g.samples.length;}}
 for(const pass of ['total','color','shadow','depth']){const sum=r.summary[pass],a=r.blocks.filter(b=>b.arm==='A').flatMap(b=>b.gpu[pass].samples.map(s=>s.ms)),b=r.blocks.filter(b=>b.arm==='B').flatMap(b=>b.gpu[pass].samples.map(s=>s.ms));assert.deepEqual(sum.A,stats(a));assert.deepEqual(sum.B,stats(b));assert.equal(sum.savedMs,sum.A.mean-sum.B.mean);assert.equal(sum.savedPercent,100*sum.savedMs/sum.A.mean);assert.equal(sum.pairs.length,4);}
 console.log(biome,JSON.stringify({sourceLogicalSha256:r.context.sourceLogicalSha256,totalSavingMs:r.summary.total.savedMs,totalSavingPercent:r.summary.total.savedPercent,practicalPositive:r.summary.total.savedMs>1&&r.summary.total.savedPercent>10&&r.summary.total.pairs.every(p=>p.savedMs>0),reportSha256:createHash('sha256').update(readFileSync(join(dir,biome+'-original-report.json'))).digest('hex')}));
}
assert.equal(queries,3360);console.log('PASS: 3360 valid GPU samples; both original restores and context releases verified.');
