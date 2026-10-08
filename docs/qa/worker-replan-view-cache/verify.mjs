import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
const raw=p=>gunzipSync(readFileSync(new URL(p,dir))),report=n=>JSON.parse(raw(n+'.json.gz'));
for(const p of receipt.pieces){const b=raw(p.path);assert.equal(b.length,p.rawBytes);assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);}
assert.equal(receipt.productionChanged,false);assert.equal(receipt.benchmark,true);assert.equal(receipt.benchmarkExitCode,0);assert.equal(receipt.viewTests,6);assert(receipt.exitCodes.every(x=>x===0));
const r=report('replan');assert(r.reached&&r.allValid);assert.equal(r.steps,70);assert(r.rows.every(x=>x.valid));assert.equal(r.movement.rejected,1);
const s=report('blocked-restore');assert(s.reached);assert.equal(s.rejectionTick,7);assert.equal(s.steps,63);assert.equal(s.rows.length,63);
assert.deepEqual(report('quality').results.map(x=>x.violations),[2,0]);
assert.deepEqual(report('failed-views').results.map(x=>[x.calls,x.answers]),[[100,100],[1,100]]);
const b=report('benchmark');assert.deepEqual(b.runs.map(x=>x.mode),['reference','candidate','candidate','reference']);assert.deepEqual(b.firstDivergence,[-1,-1,-1,-1]);for(const r of b.runs)assert.deepEqual(r.hashes,b.runs[0].hashes);
const sha=p=>createHash('sha256').update(raw(p)).digest('hex');assert.equal(b.sourceHashes.candidate,sha('candidate-navigation.mjs.gz'));assert.equal(b.sourceHashes.candidateGame,sha('candidate-game.mjs.gz'));assert.equal(b.sourceHashes.guard,sha('guard.mjs.gz'));
assert(b.runs.filter(r=>r.mode==='candidate').every(r=>r.movement.rejected===0));assert(b.candidateMedian>b.referenceMedian);assert(b.candidateMedian<b.referenceMedian*1.05);
assert.equal(receipt.shoreExitCode,0);const shores=report('native-shores');assert.deepEqual(shores.rows.map(r=>r.runs),[216,216,144,216,216]);assert.deepEqual(shores.rows.map(r=>r.anchorsExercised),[12,12,8,12,12]);assert(shores.rows.every(r=>r.violations===0&&r.reached===r.runs&&r.samples.every(s=>s.reached&&!s.violation)));
assert.equal(receipt.replanCostExitCode,0);const cost=report('replan-cost');assert.deepEqual(cost.runs.map(r=>r.mode),['v5','v6','v6','v5']);for(const r of cost.runs){assert.equal(r.searches,100);assert.deepEqual(r.route,cost.runs[0].route);assert.deepEqual(r.routeHashes,cost.runs[0].routeHashes);assert.equal(r.samplesMs.length,75);}assert(cost.candidateMedian<cost.referenceMedian*.03);
for(const [key,path] of [['candidate-navigation-v5.mjs','reference-navigation-v5.mjs.gz'],['candidate-navigation-v6.mjs','candidate-navigation.mjs.gz'],['bounded-worker-view-cache.mjs','bounded-views.mjs.gz'],['replan-v6.json','replan.json.gz'],['boundary-v3.json','boundary-v3.json.gz']])assert.equal(Object.entries(cost.sourceHashes).find(([p])=>p.endsWith(key))[1],sha(path));
console.log('PASS V6 archive integrity and scoped CPU/quality outcomes; no production acceptance');

assert.equal(receipt.nativeGateExitCode,0);assert.equal(receipt.nativeTrafficExitCode,0);
const gates=report('native-gates');assert.equal(gates.results.length,15);
assert.deepEqual([...new Set(gates.results.map(x=>x.material))],['zarzas','empalizada','adobe','piedra','reforzado']);
for(const g of gates.results){const [a,c]=g.arms;assert(a.reached&&c.reached);assert.deepEqual(a.rows,c.rows);assert.equal(a.final,c.final);assert.equal(c.viewCount,1);const articulated=['zarzas','empalizada','reforzado'].includes(g.material);assert.equal(c.steps,articulated?90:84);assert.equal(c.waits,articulated?6:0);assert.equal(c.restorePairs,c.steps-5);}
const traffic=report('native-traffic');assert.deepEqual(traffic.results.map(x=>x.species),['warthog','hyena','buffalo','lion','rhino']);
for(const t of traffic.results){const [a,c]=t.arms;assert(a.workerDone&&a.animalDone&&c.workerDone&&c.animalDone);assert.deepEqual(a.rows,c.rows);assert.equal(c.views,1);assert.equal(c.rejections,0);}
console.log('PASS controlled native gate and moving traffic evidence; no full gameplay acceptance');

assert.equal(receipt.fluidBoundaryExitCode,0);const fluids=report('fluid-boundary');assert.deepEqual(fluids.results.map(x=>x.biome),['sabana','gran-rio','manglares','volcanes']);assert.deepEqual(fluids.results.map(x=>x.interiorInvalid),[61,61,355,61]);assert(fluids.results.every(x=>x.anchors===32&&x.considered===20736&&x.accepted===0&&x.failure===null&&x.exercised.length===0));
console.log('PASS bounded fluid search integrity; no interior-invalid movement acceptance claimed');

assert.equal(receipt.productionCostExitCode,0);const pc=report('production-cost');assert.deepEqual(pc.runs.map(x=>x.mode),['reference','candidate','candidate','reference']);assert.deepEqual(pc.firstDivergence,[-1,0,0,-1]);assert.deepEqual(pc.runs[0].hashes,pc.runs[3].hashes);assert.deepEqual(pc.runs[1].hashes,pc.runs[2].hashes);assert(pc.runs.every(r=>r.staff===112&&r.measuredTicks===75&&r.warmupTicks===25&&r.samplesMs.length===75));assert(pc.runs.filter(r=>r.mode==='candidate').every(r=>r.movement.rejected===0));assert.equal(pc.sourceHashes.game,sha('production-game.mjs.gz'));assert.equal(pc.sourceHashes.navigation,sha('production-navigation.mjs.gz'));assert.equal(pc.sourceHashes.candidate,sha('candidate-navigation.mjs.gz'));assert.equal(pc.sourceHashes.candidateGame,sha('candidate-game.mjs.gz'));assert.equal(pc.sourceHashes.guard,sha('guard.mjs.gz'));
console.log('PASS production-baseline ABBA integrity; divergent routing and timing drift prevent general performance acceptance');
