// Reproduce the ordinary paid opening; retain the previous full golden intact.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';

const output=process.argv[2];assert.ok(output,'Usage: OUTPUT_DIRECTORY');mkdirSync(output,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const oldBytes=gunzipSync(readFileSync(new URL('../docs/qa/crop-route-epoch-experiment/golden-baseline/crop-epoch-golden-current-state.json.gz',import.meta.url)));
const oldHash=hash(oldBytes);assert.equal(oldHash,'5df191a540b7b584a9d45cf1c20e9f15b80b39e0779c0545bdf92417572de389');
const oldState=deserialize(oldBytes.toString('utf8'));
const provenance=intensiveRunProvenance(process.argv.slice(2));
const options={days:1,seed:712,profile:'olderMale',mixed:true,middayHiring:true};
const result=simulateIntensiveFarm(options);auditIntensiveFarm(result);
const newBytes=Buffer.from(serialize(result.state));
const facts=s=>{
 const delivered=s.crates.filter(c=>c.delivered);
 auditIntensiveFarm({state:s,counts:{CrateDelivered:delivered.length,CropPicked:s.crates.length}});
 const cash={income:0n,seeds:0n,wages:0n,repairs:0n,construction:0n};
 for(const [id,value] of Object.entries(s.ledger.entries)){
  const amount=BigInt(value.n);
  if(id.startsWith('deliver:'))cash.income+=amount;
  else if(id.startsWith('intensive-plant-'))cash.seeds-=amount;
  else if(id.startsWith('intensive-hire-'))cash.wages-=amount;
  else if(id.startsWith('repair:'))cash.repairs-=amount;
  else if(id==='center')cash.construction-=amount;
 }
 return {day:s.day,completedNights:s.completedNights,result:s.result,
  plants:s.plants.length,living:s.plants.filter(p=>p.alive).length,delivered:delivered.length,
  workers:s.workers.length,balance:s.ledger.balance.n,centerHp:s.structures[0].hp,
  cash:Object.fromEntries(Object.entries(cash).map(([k,v])=>[k,String(v)]))};
};
const {state,nav,...report}=result;
const comparison={status:'audited',options,provenance,
 before:{snapshotSha256:oldHash,...facts(oldState)},after:{snapshotSha256:hash(newBytes),...facts(state)},
 runtimeScope:'Candidate harvest prices only. Existing strategy, seed, physical FIFO/deliveries, staff policy, costs, growth, collision rules and initial money are unchanged. Income can change reinvestment and hence history, not only the serialized ledger.',
 limitation:'One native day is a golden compatibility/financial diagnostic. It does not approve 100-night responsible activity or the full biome/culture matrix.'};
writeFileSync(join(output,'opening-current-state.json.gz'),gzipSync(newBytes));
writeFileSync(join(output,'opening-report.json'),JSON.stringify({...report,provenance},null,2)+'\n');
writeFileSync(join(output,'comparison.json'),JSON.stringify(comparison,null,2)+'\n');
console.log(JSON.stringify({before:comparison.before,after:comparison.after}));
