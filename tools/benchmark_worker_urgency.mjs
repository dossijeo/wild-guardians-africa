import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import * as Game from '../src/simulation/game.js';import {Navigation,BIOME_IDS} from '../src/world/navigation.js';import {deserialize,serialize} from '../src/persistence/snapshots.js';import {numberOf} from '../src/simulation/money.js';import {activeChunkRegion} from '../src/world/active-region.js';import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
assert.ok(process.argv[2],'Pass frozen reference root');assert.ok(process.argv[3],'Pass output JSON');
const root=resolve(process.argv[2]),ReferenceGame=await import(pathToFileURL(resolve(root,'src/simulation/game.js'))),{Navigation:ReferenceNavigation}=await import(pathToFileURL(resolve(root,'src/world/navigation.js')));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const median=values=>{const a=[...values].sort((x,y)=>x-y);return (a[(a.length-1)>>1]+a[a.length>>1])/2;};
const summarize=values=>{const a=[...values].sort((x,y)=>x-y);return {samples:a.length,medianMs:median(a),p95Ms:a[Math.ceil(a.length*.95)-1],maxMs:a.at(-1),totalMs:a.reduce((n,x)=>n+x,0)};};
const report={scope:'Continuation of four actual archived 100-night victories through ordinary postgame and paid hiring commands. Native terrain; no overrides to balance, growth, FIFO, route, damage or history. Fifteen simulated seconds warmup then twenty measured, tick=0.1 seconds; alternating reference/candidate order each step. Setup, checkpoint validation/serialization/hash, events collection and file IO excluded from tick timing. CPU simulation costs, not rendering frametimes, FPS, GPU, RAM, phone or a current-balance 100-night campaign.',node:process.version,referenceRoot:root,cases:[]};
for(const name of ['intensive-mangrove-shield-100','intensive-river-rejoin-100','crop-lifecycle-eight-100','intensive-sabana-musgum-e461b550']){
 const file=new URL('../docs/qa/'+name+'/state.json.gz',import.meta.url),raw=gunzipSync(readFileSync(file)),saved=deserialize(raw.toString('utf8'));assert.equal(saved.result,'victory');assert.equal(saved.day,101);
 const live=saved.plants.filter(p=>p.alive).length,staff=Math.max(1,Math.min(Math.ceil(live/12),Math.floor(numberOf(saved.ledger.balance)/30)));assert.ok(staff>0);
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[saved.biome]+'.json',import.meta.url),'utf8')).profile;
 const worlds={};for(const mode of ['reference','candidate']){
  const module=mode==='reference'?ReferenceGame:Game,Class=mode==='reference'?ReferenceNavigation:Navigation,s=deserialize(raw.toString('utf8')),nav=new Class(s.seed,s.biome,profile);nav.setState(s);const center=s.structures.find(c=>c.kind==='center'&&c.hp>0);assert.ok(center);
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  module.continuePostgame(s);module.hire(s,'qa-work-urgency-hire',{olderFemale:staff});assert.equal(numberOf(s.ledger.balance),numberOf(saved.ledger.balance)-staff*30);assert.equal(s.pauses.length,0);
  const world={s,nav,module,ms:[],queries:0,events:{warmup:{},measured:{}},seen:new Set(s.events.map(e=>e.id))};const find=nav.findPath;nav.findPath=function(...args){world.queries++;return find.apply(this,args);};worlds[mode]=world;
 }
 const checkpoints=[];function compare(label){const a=serialize(worlds.reference.s),b=serialize(worlds.candidate.s);assert.equal(b,a,label);checkpoints.push({label,sha256:hash(a),elapsed:worlds.candidate.s.elapsed});}
 compare('paid-postgame-setup');const started=performance.now();
 for(let step=0;step<350;step++){
  for(const mode of step%2?['candidate','reference']:['reference','candidate']){
   const w=worlds[mode],start=performance.now();w.module.tick(w.s,.1,w.nav);const ms=performance.now()-start;if(step>=150)w.ms.push(ms);assert.equal(w.s.result,null);assert.equal(w.s.pauses.length,0);
   for(const e of w.s.events)if(!w.seen.has(e.id)){w.seen.add(e.id);const phase=step>=150?'measured':'warmup';w.events[phase][e.type]=(w.events[phase][e.type]??0)+1;}
  }
  if((step+1)%50===0)compare('step-'+(step+1));
 }
 compare('end');assert.deepEqual(worlds.candidate.events,worlds.reference.events);assert.equal(worlds.candidate.queries,worlds.reference.queries);
 const {s}=worlds.candidate,row={source:name,inputSha256:hash(raw),biome:s.biome,culture:s.culture,day:s.day,history:{plants:saved.plants.length,livePlants:live,crates:saved.crates.length},staff,wages:staff*30,setupMoney:numberOf(saved.ledger.balance)-staff*30,endMoney:numberOf(s.ledger.balance),events:worlds.candidate.events,pathSearches:worlds.candidate.queries,checkpoints,samples:worlds.reference.ms.map((ms,i)=>({step:i+151,referenceMs:ms,candidateMs:worlds.candidate.ms[i]})),candidateFasterTicks:worlds.reference.ms.filter((ms,i)=>worlds.candidate.ms[i]<ms).length,timing:{reference:summarize(worlds.reference.ms),candidate:summarize(worlds.candidate.ms)},wallMsIncludingBothWorldsAndChecks:performance.now()-started};
 report.cases.push(row);writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({source:name,staff,pathSearches:row.pathSearches,timing:row.timing,events:row.events}));
}
