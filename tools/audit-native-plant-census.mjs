// Read-only population reconciliation. Inventory valuations are not income.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {cropSpec} from '../src/simulation/rules.js';
const dirs=process.argv.slice(2);assert.ok(dirs.length);
const cases=dirs.map(directory=>{
 const root=resolve(directory),read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
 const receipt=read('receipt.json'),report=read('report.json'),source=read('source.json');
 assert.ok(['observed-horizon','observed-native-defeat'].includes(receipt.status));
 for(const path of ['src/simulation/rules.js','src/simulation/balance.js']){
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),source.sourceHashes[path],'Frozen crop prices must match');
 }
 const bytes=readFileSync(join(root,'state.json.gz')),state=JSON.parse(gunzipSync(bytes));
 const species={},plants=new Map();let picked=0,destroyed=0,living=0,liveSeedReplacementCost=0,liveBaseHarvestPotential=0;
 for(const p of state.plants){
  assert.ok(!plants.has(p.id));plants.set(p.id,p);
  const hp=p.attackHitPoints??2;assert.ok([1,2].includes(hp));
  const q=species[p.species]??={purchased:0,living:0,picked:0,destroyed:0};q.purchased++;
  if(p.alive){q.living++;living++;liveSeedReplacementCost+=cropSpec(p.species).plant_cost;liveBaseHarvestPotential+=cropSpec(p.species).base_harvest_value;}
  else if((p.attackHits??0)>=hp){q.destroyed++;destroyed++;}
  else {q.picked++;picked++;}
 }
 assert.equal(state.plants.length,report.counts.CropPlaced);
 assert.equal(picked,report.counts.CropPicked??0);assert.equal(destroyed,report.counts.CropDestroyed??0);
 assert.equal(living,report.daily.at(-1).living);
 const crateSources=new Set();
 for(const c of state.crates){
  const p=plants.get(c.sourcePlantId);assert.ok(p&&!p.alive&&(p.attackHits??0)<(p.attackHitPoints??2));
  assert.ok(!crateSources.has(c.sourcePlantId));crateSources.add(c.sourcePlantId);
 }
 assert.equal(crateSources.size,picked);
 const initialLiving=state.plants.length-report.daily.reduce((n,d)=>n+d.planted,0);
 assert.ok(Number.isSafeInteger(initialLiving)&&initialLiving>=0);
 let previous=initialLiving,totalPicked=0,totalDelivered=0;
 const daily=report.daily.map(d=>{
  const inferredPicked=previous+d.planted-d.destroyed-d.living;
  assert.ok(Number.isSafeInteger(inferredPicked)&&inferredPicked>=0);
  totalPicked+=inferredPicked;totalDelivered+=d.delivered;assert.ok(totalDelivered<=totalPicked);
  const row={day:d.day,openingLiving:previous,planted:d.planted,pickedFromCensus:inferredPicked,destroyed:d.destroyed,closingLiving:d.living,delivered:d.delivered,undeliveredCrates:totalPicked-totalDelivered};previous=d.living;return row;
 });
 assert.equal(totalPicked,picked);assert.equal(totalDelivered,report.counts.CrateDelivered??0);
 assert.equal(picked-totalDelivered,state.crates.filter(c=>!c.delivered).length);
 assert.deepEqual(readFileSync(join(root,'state.json.gz')),bytes);
 return {directory,seed:report.seed,strategy:report.strategy,status:receipt.status,initialLiving,living,picked,destroyed,species,money:report.money,liveSeedReplacementCost,liveBaseHarvestPotential,daily,snapshotUnchanged:true,scope:'Population counts reconcile native placement/pick/destruction/delivery aggregates with the snapshot. Daily picked counts are inferred from population conservation. Replacement cost and harvest potential are not spendable cash, delivered income or forecasts of guaranteed profit.'};
});
console.log(JSON.stringify({cases},null,2));
