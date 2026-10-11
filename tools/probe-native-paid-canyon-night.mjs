import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {NativeCampaignEntryDriver} from './native-campaign-entry-driver.mjs';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
const [input,output]=process.argv.slice(2),snapshotPath=output?.replace(/\.json$/,'-state.json.gz');
assert(input&&output?.endsWith('.json')&&!existsSync(output)&&!existsSync(snapshotPath));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());
assert.equal(s.day,1);assert.equal(s.time,300);assert.equal(s.pauses.length,0);
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json',nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(s);
const driver=new NativeCampaignEntryDriver(nav,{maxWaitMilliseconds:60000}),events=[],seen=new Set(s.events.map(e=>e.id)),trace=[],startElapsed=s.elapsed;
const opening=numberOf(s.ledger.balance),initialWalls=s.structures.filter(p=>p.kind==='wall').map(p=>({id:p.id,hp:p.hp,status:p.status}));
let error=null,steps=0;
try{
 while(s.day===1&&!s.result&&!s.pauses.length&&s.elapsed-startElapsed<2400){
  await driver.advancePresentation(s);
  if(Game.nightEntryPending(s)&&s.time>=600)await driver.waitForEntry(s);
  Game.tick(s,.5,nav);steps++;
  for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);events.push({...e,time:s.time,elapsed:s.elapsed});}
  if(steps%2===0&&s.raid)trace.push({time:s.time,elapsed:s.elapsed,animals:s.raid.animals.map(a=>({id:a.id,species:a.species,x:a.x,z:a.z,status:a.status,hitsRemaining:a.hitsRemaining,targetId:a.targetId}))});
 }
}catch(e){error={message:e.message,stack:e.stack};}
const entry=driver.report();await driver.dispose();assert.equal(hash(readFileSync(input)),hash(bytes));
const paths=['tools/probe-native-paid-canyon-night.mjs','tools/native-campaign-entry-driver.mjs','tools/node-raid-entry-transport.mjs','tools/node-raid-entry-worker.mjs','src/simulation/game.js','src/simulation/raids.js','src/simulation/raid-agricultural-impact.js','src/world/navigation.js','src/world/raid-entry-preparer.js','src/world/raid-entry-data.js',profilePath];
const result={status:error?'technical-observation-failure':s.day===2?'observed-native-night-complete':'observed-native-night-incomplete',input,inputSha256:hash(bytes),snapshotPath,error,steps,day:s.day,time:s.time,elapsed:s.elapsed,result:s.result,pauses:s.pauses,
 opening,closing:numberOf(s.ledger.balance),initialWalls,finalWalls:s.structures.filter(p=>p.kind==='wall').map(p=>({id:p.id,hp:p.hp,status:p.status})),living:s.plants.filter(p=>p.alive).length,
 logicalHits:events.filter(e=>e.type==='AnimalLogicalHit').length,logicalMisses:events.filter(e=>e.type==='AnimalLogicalMiss').length,structureHits:events.filter(e=>e.type==='StructureHit').length,cropDestroyed:events.filter(e=>e.type==='CropDestroyed').length,
 events,trace,entry,sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),
 scope:'Retained paid small Canyon fixture after its native work day. Original RNG/night plan, real entry worker, native movement and attacks, no shield, damage override, teleports, manual target assignment or new purchases. Functional one-night evidence, not campaign balance or performance acceptance. Observation failure is never an economic defeat.'};
writeFileSync(snapshotPath,gzipSync(Buffer.from(serialize(s))));writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,error,day:s.day,result:s.result,living:result.living,logicalHits:result.logicalHits,structureHits:result.structureHits,cropDestroyed:result.cropDestroyed}));
