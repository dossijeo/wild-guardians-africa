import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Navigation} from '../src/world/navigation.js';
import {simulateIntensiveFarm,auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import assert from 'node:assert/strict';
const sync=Navigation.prototype.syncCropPlacement,setState=Navigation.prototype.setState,rows=[];
for(const mode of ['reference','cached']){
 const counters={cropSyncs:0,emptyPlacements:0,fullStateRebuilds:0};
 Navigation.prototype.setState=function(...args){counters.fullStateRebuilds++;return setState.apply(this,args);};
 Navigation.prototype.syncCropPlacement=function(state,props=[]){counters.cropSyncs++;if(!props.length)counters.emptyPlacements++;return mode==='reference'?this.setState(state):sync.call(this,state,props);};
 try{
  const started=performance.now(),result=simulateIntensiveFarm({days:3,seed:712});
  const ms=performance.now()-started;auditIntensiveFarm(result);
  const sha256=createHash('sha256').update(serialize(result.state)).digest('hex');
  rows.push({mode,ms,sha256,counters,planted:result.counts.CropPlaced,delivered:result.counts.CrateDelivered,money:result.money});
 }finally{Navigation.prototype.syncCropPlacement=sync;Navigation.prototype.setState=setState;}
}
assert.equal(rows[0].sha256,rows[1].sha256,'Complete domain state changed');
writeFileSync(process.argv[2]??'test-results/crop-navigation-benchmark.json',JSON.stringify({scenario:'Native Sabana/Mapungubwe seed 712, original intensive policy, three complete days. Same process and ordinary commands. Reference performs the former full navigation setState for each crop.',rows,scope:'Single-run CPU timings with concurrent campaigns and tests, not a stable median, GPU frametime or phone FPS. Exact complete-state hash and work counters are the acceptance evidence.'},null,2)+'\n');
console.log(JSON.stringify(rows));
