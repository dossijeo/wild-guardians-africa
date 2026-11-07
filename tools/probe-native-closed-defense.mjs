import assert from 'node:assert/strict';
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createOpeningWorld} from './check_opening.mjs';
import {createNativeClosedDefensePolicy,selectClosedDefenseContour} from './native-closed-defense-policy.mjs';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function probeNativeClosedDefense(){
 const {s,nav}=createOpeningWorld(),center=s.structures[0];
 const point={x:center.x+6,z:center.z+1};assert.ok(nav.placement(point.x,point.z,.4).valid);Game.plant(s,'probe-seed','mijo',point.x,point.z,nav);Game.openInitialHiring(s);Game.hire(s,'probe-hire',{olderFemale:1});
 const crops=structuredClone(s.plants),suppressed=[...s.suppressed],before=serialize(s),policy=createNativeClosedDefensePolicy();let id=0;
 const start=performance.now();assert.equal(policy.act(s,nav,{command:k=>'probe-defense-'+k+id++,reserve:160}),1);const policyCpuMs=performance.now()-start;
 assert.deepEqual(s.plants,crops);assert.deepEqual(s.suppressed,suppressed);assert.equal(s.time,0);assert.equal(s.elapsed,0);
 const paidState=serialize(s),receipt=policy.report(),bounds=receipt.built.bounds;
 const interior=point,from={x:bounds[2]+5,z:point.z},radius=1.1;
 assert.ok(nav.walkable(from.x,from.z,radius,null,false));assert.ok(nav.walkable(interior.x,interior.z,radius,null,false));
 const routeStart=performance.now(),route=nav.path(from,interior,radius,null,false),routeCpuMs=performance.now()-routeStart;
 assert.equal(route,null,'Native animal path must not enter this actually paid rectangle');assert.equal(serialize(s),paidState);
 const speciesRoutes=[];for(const [species,r] of Object.entries(ANIMAL_ACTIONS.animals)){
  const bodyRadius=r.presentation.footprint.radius,t=performance.now();assert.ok(nav.walkable(from.x,from.z,bodyRadius,null,false));assert.ok(nav.walkable(interior.x,interior.z,bodyRadius,null,false));const path=nav.path(from,interior,bodyRadius,null,false);assert.equal(path,null);speciesRoutes.push({species,radius:bodyRadius,bothEndpointsWalkable:true,path,cpuMs:performance.now()-t});
 }
 const gate=s.structures.find(w=>w.kind==='wall'&&w.gate),portals=gatePortalPoints(gate);assert.equal(portals.length,2);
 const gateChecks={worker:nav.segmentClear(portals[0],portals[1],.28,null,true),animal:nav.segmentClear(portals[0],portals[1],radius,null,false)};assert.equal(gateChecks.worker,true);assert.equal(gateChecks.animal,false);
 nav.setActiveBounds([center.x-120,center.z-120,center.x+120,center.z+120]);nav.setRaidView({x:center.x+30,z:center.z+15},interior);
 const plan={group:['warthog'],introductory:true};assert.equal(spawnRaid(s,plan,nav),true);const actor=s.raid.animals[0],birth={x:actor.x,z:actor.z};
 assert.ok(birth.x-radius>bounds[2]||birth.x+radius<bounds[0]||birth.z-radius>bounds[3]||birth.z+radius<bounds[1]);
 const trace=[];let hit=null;
 for(let i=0;i<600&&!hit&&!s.result&&s.raid;i++){
  const from={x:actor.x,z:actor.z},oldElapsed=s.elapsed;Game.tick(s,.1,nav);
  assert.ok(nav.segmentClear(from,actor,actor.radius,null,false),'Native actor swept movement cannot cross an intact wall');
  trace.push({elapsed:s.elapsed,time:s.time,from,to:{x:actor.x,z:actor.z},status:actor.status,targetId:actor.targetId,hitsRemaining:actor.hitsRemaining,advanced:s.elapsed-oldElapsed});
  hit=s.events.find(e=>e.type==='StructureHit');
 }
 assert.ok(hit,'Bounded native tick fixture must reach an actual wall hit');assert.equal(s.structures.find(w=>w.id===hit.targetId).kind,'wall');assert.equal(s.events.filter(e=>e.type==='CropHit').length,0);
 assert.ok(trace.some(r=>r.advanced>0&&Math.hypot(r.from.x-r.to.x,r.from.z-r.to.z)>0));
 return {scope:'Legal first-day planting, wages and complete paid contour on genuine seed712/Sabana/Mapungubwe. Five native-radius fixed-endpoint paths and one bounded Game.tick wall contact, not a campaign or universal enclosure proof.',initialState:JSON.parse(before),paidState:JSON.parse(paidState),finalState:JSON.parse(serialize(s)),initialSHA:sha(before),paidSHA:sha(paidState),finalSHA:sha(serialize(s)),receipt,bounds,gateChecks,route:{from,to:interior,radius,bothEndpointsWalkable:true,result:route},speciesRoutes,birth,hit,trace,cpu:{policyCpuMs,routeCpuMs},money:{initial:1500,centre:800,seed:5,wages:30,defense:receipt.paidCost,afterDefense:numberOf(JSON.parse(paidState).ledger.balance),final:numberOf(s.ledger.balance)}};
}
export function probeNativeClosedContourLimit(){
 const {s,nav}=createOpeningWorld({biome:'gran-canon'}),before=serialize(s),start=performance.now();
 const result=selectClosedDefenseContour(s,nav,{funds:540});assert.equal(result.candidate,null);assert.equal(serialize(s),before);
 return {scope:'Bounded nine-contour Canyon negative; no accepted closed contour and no purchase, not impossibility of all native defenses.',sourceStateSHA:sha(before),biome:s.biome,seed:s.seed,attempts:result.attempts,stateUnchanged:true,cpuMs:performance.now()-start};
}
export function probeNativeContourExpansion(){
 const {s,nav}=createOpeningWorld(),c=s.structures[0];Game.plant(s,'expanded-seed','mijo',c.x+6,c.z+9,nav);const original=serialize(s),crops=structuredClone(s.plants),suppressed=[...s.suppressed],p=createNativeClosedDefensePolicy();let id=0;
 assert.equal(p.act(s,nav,{command:k=>'expanded-'+k+id++,reserve:160}),1);assert.deepEqual(s.plants,crops);assert.deepEqual(s.suppressed,suppressed);const receipt=p.report();assert.deepEqual(receipt.history[0].attempts.map(r=>r.reason),['native-prop-suppression','native-omissions','complete-legal-slots']);
 return {scope:'Legal native sowing followed by bounded third-contour purchase, with crops/props retained. No simulation or interception inference.',before:JSON.parse(original),after:JSON.parse(serialize(s)),beforeSHA:sha(original),afterSHA:sha(serialize(s)),receipt};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=process.argv[2];if(!output||existsSync(output))throw Error('New output directory required');mkdirSync(output,{recursive:true});
 try{const results={physical:probeNativeClosedDefense(),limit:probeNativeClosedContourLimit(),expansion:probeNativeContourExpansion()};writeFileSync(output+'/physical.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({status:'passed',money:results.physical.money,hit:results.physical.hit.type,trace:results.physical.trace.length,cpu:results.physical.cpu,canyonAccepted:false,expansionAttempts:results.expansion.receipt.history[0].attempts.length}));}
 catch(error){writeFileSync(output+'/failure.json',JSON.stringify({status:'failed',error:error.message,stack:error.stack},null,2)+'\n');throw error;}
}
