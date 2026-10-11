import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
const [input,output]=process.argv.slice(2),snapshotPath=output?.replace(/\.json$/,'-state.json.gz');
assert(input&&output?.endsWith('.json')&&!existsSync(output)&&!existsSync(snapshotPath));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(input);let s=deserialize(gunzipSync(bytes).toString()),nav;
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json',profile=JSON.parse(readFileSync(profilePath)).profile;
const attach=()=>{nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);};attach();
assert.equal(s.day,2);assert.equal(s.time,0);assert(s.pauses.includes('hiring'));
const opening=numberOf(s.ledger.balance),initialEntries=new Set(Object.keys(s.ledger.entries));
Game.hire(s,'repair-day-hire',{olderFemale:1});assert.equal(s.hiringPaidDay,2);assert.equal(opening-numberOf(s.ledger.balance),30);
const targets=s.structures.filter(p=>p.hp<p.maxHp&&p.status!=='ruined');assert.equal(targets.length,1);
const target=targets[0],beforeHp=target.hp,expectedCost=Math.ceil(numberOf(Game.repairCost(target))),beforeRequest=numberOf(s.ledger.balance);
assert(Game.requestRepair(s,'repair-day-request',target.id));
assert.equal(Game.requestRepair(s,'repair-day-request',target.id),false,'Repeated command ID must not duplicate the order');
assert.equal(numberOf(s.ledger.balance),beforeRequest,'Request must not charge before worker arrival');
assert.equal(s.tasks.filter(t=>t.kind==='repair'&&t.targetId===target.id).length,1);
const events=[],seen=new Set(s.events.map(e=>e.id)),trace=[];let steps=0,reload=null;
while(s.day===2&&s.time<300-1e-9&&!s.result&&!s.pauses.length){
 Game.tick(s,Math.min(.5,300-s.time),nav);steps++;
 for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);events.push({...e,time:s.time});}
 if(steps%2===0)trace.push({time:s.time,targetHp:s.structures.find(p=>p.id===target.id)?.hp,workers:s.workers.map(w=>({id:w.id,x:w.x,z:w.z,status:w.status,taskId:w.taskId}))});
 if(!reload&&s.time>=25){reload={time:s.time,pendingRepair:s.tasks.some(t=>t.kind==='repair'&&t.targetId===target.id),targetHp:s.structures.find(p=>p.id===target.id)?.hp};const saved=serialize(s);s=deserialize(saved);assert.equal(serialize(s),saved);attach();}
 if(steps%20===0)await new Promise(resolve=>setImmediate(resolve));
}
const entries=Object.entries(s.ledger.entries).filter(([id])=>!initialEntries.has(id)).map(([id,value])=>({id,coins:numberOf(value)})),payments=entries.filter(e=>e.id.startsWith('repair:'));
const income=entries.filter(e=>e.id.startsWith('deliver:')).reduce((n,e)=>n+e.coins,0),net=entries.reduce((n,e)=>n+e.coins,0),closing=numberOf(s.ledger.balance);
assert.equal(closing,opening+net);assert.equal(hash(readFileSync(input)),hash(bytes));
const repairs=events.filter(e=>e.type==='RepairApplied'),finalTarget=s.structures.find(p=>p.id===target.id);
const paths=['tools/probe-native-canyon-paid-repair-day.mjs','src/simulation/game.js','src/simulation/tasks.js','src/simulation/rules.js','src/simulation/money.js','src/world/work-points.js','src/world/navigation.js','src/persistence/snapshots.js',profilePath];
const result={status:payments.length===1&&payments[0].coins===-expectedCost&&finalTarget.hp===finalTarget.maxHp?'observed-native-paid-repair':'native-repair-not-demonstrated',
 input,inputSha256:hash(bytes),snapshotPath,opening,closing,income,expectedCost,requestedTarget:{id:target.id,hp:beforeHp,maxHp:target.maxHp,cost:target.cost},
 finalTarget:{id:finalTarget.id,hp:finalTarget.hp,status:finalTarget.status},requestCharged:false,repeatedCommandRejected:true,payments,repairs,entries,reconciliationDifference:closing-opening-net,reload,day:s.day,time:s.time,result:s.result,pauses:s.pauses,events,trace,
 sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),
 scope:'Actual day-2 hire and repair request on retained native night damage. No damage edits, cash grants, forced completion or path overrides. Normal crop deliveries and worker movement, passive reload at second 25, exact ledger reconciliation. Single paid functional repair, not maintenance calibration or long campaign acceptance.'};
writeFileSync(snapshotPath,gzipSync(Buffer.from(serialize(s))));writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,opening,closing,income,expectedCost,payments,repairs:repairs.length,reload,time:s.time}));
