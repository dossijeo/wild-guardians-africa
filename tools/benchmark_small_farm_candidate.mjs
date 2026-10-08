// Paid native opening: no QA credit, terrain, growth or route overrides.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as Setup from '../src/simulation/game.js';
import {createOpeningWorld} from './check_opening.mjs';
import {centerServicePoint} from '../src/world/centers.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
assert.ok(process.argv[2]&&process.argv[3]&&process.argv[4],'Pass reference, candidate and output');
const worlds=[];
for(const root of process.argv.slice(2,4))worlds.push({Game:await import(pathToFileURL(resolve(root,'src/simulation/game.js'))),Navigation:(await import(pathToFileURL(resolve(root,'src/world/navigation.js')))).Navigation});
const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile;
const hash=text=>createHash('sha256').update(text).digest('hex');
const report={scope:'Native paid first-day eight-millet opening, one employee of each profile tested separately. Two warmup and eight measured pairs per profile, alternating arm order per tick/trial; stop at result, blocking pause or 1200 ticks of .5s. Only Game.tick timed; setup, validation and hashes excluded. CPU simulation, not rendering/FPS/GPU/mobile or a full campaign.',cases:[]};
for(const worker of ['olderMale','olderFemale','youngMale','youngFemale']){
 const {s,nav}=createOpeningWorld({slotId:'qa-small-'+worker}),center=s.structures[0],origin=centerServicePoint(center,s,.8);
 let planted=0;
 for(let dz=-9;dz<=9&&planted<8;dz+=1.5)for(let dx=4.5;dx<=15&&planted<8;dx+=1.5){
  const x=Math.round((center.x+dx)/1.5)*1.5,z=Math.round((center.z+dz)/1.5)*1.5,point={x,z};
  if(!nav.placement(x,z,.4).valid||!nav.path(origin,point,.28,null,true)||!nav.path(point,origin,.28,null,true))continue;
  if(Setup.plant(s,'small-plant-'+planted,'mijo',x,z,nav))planted++;
 }
 assert.equal(planted,8);Setup.openInitialHiring(s);Setup.hire(s,'small-hire',{[worker]:1});assert.equal(s.workers.length,1);assert.equal(s.pauses.length,0);
 const initial=serialize(s),samples=[];let expected;
 for(let trial=-2;trial<8;trial++){
  const pair=worlds.map(w=>{const s=deserialize(initial),nav=new w.Navigation(s.seed,s.biome,profile);nav.setState(s);return {...w,s,nav,totalMs:0,maxMs:0,searches:0};});
  for(const w of pair){const find=w.nav.findPath;w.nav.findPath=function(...args){w.searches++;return find.apply(this,args);};}
  let steps=0,checkpoints=0;
  while(steps<1200&&!pair[0].s.result&&!pair[0].s.pauses.length){
   for(const i of (steps+trial)%2?[1,0]:[0,1]){const w=pair[i],started=performance.now();w.Game.tick(w.s,.5,w.nav);const ms=performance.now()-started;w.totalMs+=ms;w.maxMs=Math.max(w.maxMs,ms);}
   steps++;if(steps%25===0){assert.equal(serialize(pair[1].s),serialize(pair[0].s));checkpoints++;}
  }
  const final=serialize(pair[0].s);assert.equal(serialize(pair[1].s),final);checkpoints++;assert.equal(pair[1].searches,pair[0].searches);
  expected??=hash(final);assert.equal(hash(final),expected);
  const row={trial,steps,checkpoints,searches:pair[0].searches,reference:{totalMs:pair[0].totalMs,maxMs:pair[0].maxMs},candidate:{totalMs:pair[1].totalMs,maxMs:pair[1].maxMs}};
  if(trial>=0)samples.push(row);
 }
 const median=(arm,key)=>{const values=samples.map(r=>r[arm][key]).sort((a,b)=>a-b);return (values[3]+values[4])/2;};
 const row={profile:worker,paidOpeningMoney:numberOf(s.ledger.balance),initialSha256:hash(initial),finalSha256:expected,samples,medianMs:{reference:median('reference','totalMs'),candidate:median('candidate','totalMs')},candidateWins:samples.filter(r=>r.candidate.totalMs<r.reference.totalMs).length};
 report.cases.push(row);writeFileSync(process.argv[4],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...row,samples:undefined}));
}
