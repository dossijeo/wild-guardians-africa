import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [baselinePath,candidatePath,output]=process.argv.slice(2);assert(baselinePath&&candidatePath&&output);
const baseline=JSON.parse(readFileSync(baselinePath)),candidate=JSON.parse(readFileSync(candidatePath));
assert.equal(baseline.snapshotSha256,candidate.snapshotSha256);assert.deepEqual(baseline.placed,candidate.placed);
assert.equal(baseline.initialCash,candidate.initialCash);assert.equal(baseline.finalCash,candidate.finalCash);
for(const path of ['src/simulation/game.js','src/world/navigation.js','tools/native-worker-service-proof-v3.mjs'])assert.equal(baseline.sourceHashes[path],candidate.sourceHashes[path]);
const rows=baseline.rows.map((a,i)=>{
 const b=candidate.rows[i];assert.equal(a.label,b.label);assert.equal(a.cash,b.cash);assert.equal(a.living,b.living);assert.equal(a.navVersion,b.navVersion);assert.equal(a.proof.valid,b.proof.valid);assert.equal(a.proof.reason,b.proof.reason);
 if(a.proof.valid){
  assert.deepEqual(a.proof.workerService,b.proof.workerService);
  for(let j=0;j<a.proof.checks.length;j++){
   const full=a.proof.checks[j],incremental=b.proof.checks[j];
   assert.equal(full.radius,incremental.radius);assert.deepEqual(full.inside,incremental.inside);assert.deepEqual(full.outside,incremental.outside);
   if(full.services){
    const poses=incremental.services.poses+(incremental.incrementalServices?.poses??0);
    assert.equal(full.services.poses,poses,'All target poses must remain accounted for');
   }
  }
 }else if(b.proof.incrementalFailure){
  const failed=b.proof.incrementalFailure.services,original=a.proof.checks.at(-1).services;
  assert.equal(failed.targetId,original.targetId);assert.deepEqual(failed.point,original.point);
 }
 return {label:a.label,valid:a.proof.valid,baselineMs:a.milliseconds,candidateMs:b.milliseconds,deltaMs:b.milliseconds-a.milliseconds};
});
writeFileSync(output,JSON.stringify({scope:'Sequential frozen-snapshot comparison; not AB/BA or campaign acceptance',baselinePath,candidatePath,snapshotSha256:baseline.snapshotSha256,nativePlacementsMoneyAndWorkerCoverageEqual:true,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows));
