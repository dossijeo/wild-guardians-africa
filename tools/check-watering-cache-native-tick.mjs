import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const [out,stepsText='30',...extra]=process.argv.slice(2),steps=Number(stepsText);
assert(out&&!extra.length&&!existsSync(out));assert(Number.isSafeInteger(steps)&&steps>=5&&steps<=100);
const gameUrl=new URL('../src/simulation/game.js',import.meta.url),source=readFileSync(gameUrl,'utf8');
assert(!source.includes('import.meta'),'The QA import adapter cannot replace module-relative runtime expressions');
const controlSource=source.replace(/from '([^']+)'/g,(_match,spec)=>`from '${spec==='../world/work-points.js'?new URL('../tests/fixtures/watering-route-v1-reference.mjs',import.meta.url).href:new URL(spec,gameUrl).href}'`);
const Control=await import('data:text/javascript;base64,'+Buffer.from(controlSource).toString('base64'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile;
const rows=[];
for(const suffix of ['1','10'])for(const blocked of [false,true]){
 const bytes=readFileSync(new URL(`../tests/fixtures/watering-gran-canon-saheliana-detour-${suffix}.json.gz`,import.meta.url));
 const state=deserialize(gunzipSync(bytes).toString());
 if(blocked){
  // Explicit synthetic collision fixture. Keep actual crops/tasks/contracts;
  // make existing workers idle and enclose their bodies in native solids.
  for(const w of state.workers){w.status='idle';w.taskId=null;w.path=null;state.villages[0].buildings.push({key:'blocked-'+w.id,kind:'Edificio',x:w.x,z:w.z,radius:2});}
  for(const task of state.tasks)task.workerId=null;
 }
 const initial=serialize(state),arms=[];
 for(const [variant,engine] of [['A',Control],['B',Game],['B',Game],['A',Control]]){
  const s=deserialize(initial),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  const counts={walkable:0,segmentClear:0,path:0};
  for(const name of Object.keys(counts)){const fn=nav[name];nav[name]=function(...args){counts[name]++;return fn.apply(this,args);};}
  const snapshots=[],at=performance.now();let tickMilliseconds=0;
  for(let i=0;i<steps;i++){const tickAt=performance.now();engine.tick(s,.1,nav);tickMilliseconds+=performance.now()-tickAt;snapshots.push(hash(serialize(s)));}
  arms.push({variant,milliseconds:performance.now()-at,tickMilliseconds,snapshots,finalSha256:hash(serialize(s)),nativeCalls:counts,finalTime:s.time,workers:s.workers.map(w=>({id:w.id,x:w.x,z:w.z,status:w.status,taskId:w.taskId})),events:s.events.length,ledger:s.ledger.balance});
 }
 for(const arm of arms.slice(1))assert.deepEqual(arms[0].snapshots,arm.snapshots,'Native tick state diverged from the frozen uncached recipe');
 rows.push({suffix,blocked,originalFixtureSha256:hash(bytes),steps,dt:.1,allTickStatesIdentical:true,arms});
}
const result={observedAt:new Date().toISOString(),gameSourceSha256:hash(source),scope:'Short paired native tick fixtures; only the control work-points import is redirected to the frozen pre-cache module. Two untouched recorded scenes and two explicitly synthetic blocked-worker variants. Not a daily campaign, dense-farm acceptance, new player strategy or GPU benchmark.',rows};
writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({rows:rows.map(r=>({suffix:r.suffix,blocked:r.blocked,allTickStatesIdentical:r.allTickStatesIdentical,arms:r.arms.map(({variant,milliseconds,nativeCalls,finalSha256})=>({variant,milliseconds,nativeCalls,finalSha256}))}))},null,2));
