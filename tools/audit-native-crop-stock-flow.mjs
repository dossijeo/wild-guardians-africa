// Read-only terminal stock conservation. Per-day pickups are inferred from
// recorded purchases, native losses and census; final totals require native
// observer counts and the actual retained crop/crate inventories to match.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
const [directory,output]=process.argv.slice(2);assert(directory&&output&&!existsSync(output));
const read=name=>JSON.parse(readFileSync(directory+'/'+name));
const receipt=read('receipt.json'),report=read('report.json');
assert(['observed-horizon','observed-native-defeat'].includes(receipt.status));
assert.equal(report.nativeEvidence.status,'verified');assert.equal(report.nativeEvidence.coverageLost,false);
assert.equal(report.raidEvidence.status,'verified');assert.deepEqual(report.raidEvidence.issues,[]);
const state=deserialize(gunzipSync(readFileSync(directory+'/state.json.gz')).toString());
assert.equal(state.result,receipt.result);assert.equal(state.completedNights,receipt.completedNights);
const observations=new Map(report.nativeEvidence.daily.map(row=>[row.day,row]));assert.equal(observations.size,report.daily.length);
let living=0,purchased=0,picked=0,delivered=0,destroyed=0;const days=[];
for(const [i,row] of report.daily.entries()){
 assert.equal(row.day,i+1);const observed=observations.get(row.day);assert(observed);
 assert.equal(observed.income,row.finance.income);assert.equal(observed.deliveries,row.delivered);
 const actualPurchases=observed.cropPurchases,pickups=living+actualPurchases-row.destroyed-row.living;
 assert(Number.isSafeInteger(pickups)&&pickups>=0,'Impossible inferred crop pickups');
 assert(Number.isSafeInteger(actualPurchases)&&actualPurchases>=0);
 purchased+=actualPurchases;picked+=pickups;delivered+=row.delivered;destroyed+=row.destroyed;
 assert(delivered<=picked,'Delivery precedes inferred physical crop pickup');
 days.push({day:row.day,openingLiving:living,purchased:actualPurchases,dayRowPlanted:row.planted,
  inferredPicked:pickups,delivered:row.delivered,destroyed:row.destroyed,closingLiving:row.living,
  inferredAwaitingDelivery:picked-delivered,money:row.money});living=row.living;
}
assert.equal(purchased,report.counts.CropPlaced);assert.equal(purchased,state.plants.length);
assert.equal(picked,report.counts.CropPicked);assert.equal(picked,state.crates.length);
assert.equal(delivered,report.counts.CrateDelivered);assert.equal(delivered,state.crates.filter(c=>c.delivered).length);
assert.equal(destroyed,report.counts.CropDestroyed);assert.equal(destroyed,report.raidEvidence.raids.reduce((n,r)=>n+r.cropsDestroyed,0));
assert.equal(living,state.plants.filter(p=>p.alive).length);assert.equal(purchased,picked+destroyed+living);
const result={status:'verified-native-terminal-stock-flow',directory,completedDays:days.length,
 totals:{purchased,picked,delivered,destroyed,living,awaitingDelivery:picked-delivered},days,
 scope:'Fresh native campaign terminal inventories and verified cumulative events agree. Daily pickups/waiting crates are conservation-derived diagnostics, not individually time-observed harvests. No causal strategy comparison, profitability, human activity or 100-night approval.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,totals:result.totals}));
