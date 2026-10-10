import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {wallLayout,WALL_UNIT} from '../src/world/wall-layout.js';
import {boundaryFaces,boundaryFacesSteps} from '../src/world/boundary-faces.js';
import {boundaryEdges,boundaryEdgesSteps,ensureBoundaryGates} from '../src/world/boundary-gates.js';
import {boundaryFaces as originalFaces} from './fixtures/native-boundary-81943608/boundary-faces.js';
import {boundaryEdges as originalEdges,ensureBoundaryGates as originalGates} from './fixtures/native-boundary-81943608/boundary-gates.js';
import {drainGeometrySteps} from '../src/world/geometry-steps.js';
import {RaidExteriorPrewarmer,raidExteriorGeometryRequest,computeRaidExteriorGeometry,CANONICAL_RAID_RADII} from '../src/world/raid-exterior-prewarming.js';
import {raidExteriorDiagnostics,createRaidExteriorQuery,raidExteriorInputKey} from '../src/world/raid-exterior.js';
import {serialize} from '../src/persistence/snapshots.js';
function workerReply(worker){return new Promise((resolve,reject)=>{
 const clear=()=>{clearTimeout(timeout);worker.off('message',message);worker.off('error',error);worker.off('exit',exit);};
 const message=value=>{clear();resolve(value);},error=value=>{clear();reject(value);},exit=code=>error(Error(`Worker exited before reply (${code})`));
 const timeout=setTimeout(()=>error(Error('Worker reply timeout')),5000);worker.on('message',message);worker.on('error',error);worker.on('exit',exit);
});}
const options={smooth:false,snap:false};
function fixture(biome='sabana'){
 const {s,nav}=createOpeningWorld({seed:712,biome,culture:biome==='sabana'?'saheliana':'mapungubwe'});
 const stroke=biome==='sabana'?[[85,6.2],[92,6.2],[92,17],[85,17],[85,6.2]]:[[-22,24],[-34,24],[-34,36],[-22,36]];
 assert.ok(Game.buildWallChain(s,'walls','zarzas',stroke,nav,options));return {s,nav};
}
function finish(prewarmer){let pumps=0;while(prewarmer.status==='working'&&pumps++<20000)prewarmer.pump({maxSteps:128,maxMillis:2});assert.equal(prewarmer.status,'prepared',prewarmer.lastError);return pumps;}
for(const biome of ['sabana','gran-canon'])test(`${biome}: shared generator polygons, physical boundaries and default gates equal frozen819 native ordering`,()=>{
 const {s,nav}=fixture(biome),before=serialize(s),layout=wallLayout(s.structures,{}),regions=[];
 for(const radius of CANONICAL_RAID_RADII){
  const a=originalEdges(layout,nav,{radius,worker:false}),b=boundaryEdges(layout,nav,{radius,worker:false}),c=drainGeometrySteps(boundaryEdgesSteps(layout,nav,{radius,worker:false}));assert.deepEqual(b,a);assert.deepEqual(c,a);
  const virtual=a.map(([a,b],i)=>({id:-i-1,hp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT})),pieces=[...layout.pieces,...virtual];
  assert.deepEqual(boundaryFaces(pieces),originalFaces(pieces));assert.deepEqual(drainGeometrySteps(boundaryFacesSteps(pieces)),originalFaces(pieces));regions.push({radius,faces:originalFaces(pieces).length});
 }
 const a=structuredClone(layout.pieces),b=structuredClone(layout.pieces);for(const p of [...a,...b]){p.kind='wall';p.autoGate=false;}
 const choose=p=>p.hp>0,isFree=(x,z)=>nav.walkable(x,z,.28),la={...layout,pieces:a},lb={...layout,pieces:b};
 assert.equal(ensureBoundaryGates(la,nav,choose,isFree),originalGates(lb,nav,choose,isFree));assert.deepEqual(a,b);assert.equal(serialize(s),before);
 console.log(JSON.stringify({scope:'exact before/after native graph/gate ordering, no campaign or frame acceptance',biome,regions}));
});
test('no-worker preparation makes bounded continuation progress and installs only complete canonical geometry',()=>{
 const {s,nav}=fixture('gran-canon'),original=serialize(s),prewarmer=new RaidExteriorPrewarmer(nav,{createWorker:()=>{throw Error('Unavailable');}});prewarmer.update(s);assert.ok(Object.isFrozen(prewarmer.pending.request.state.structures));
 prewarmer.pump({maxSteps:0,maxMillis:2});assert.equal(prewarmer.stats.steps,0);prewarmer.pump({maxSteps:1,maxMillis:10});assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.equal(prewarmer.status,'working');
 const pumps=finish(prewarmer);assert.equal(serialize(s),original);assert.equal(raidExteriorDiagnostics(nav).builds,0);assert.equal(raidExteriorDiagnostics(nav).adoptions,1);
 const reference=computeRaidExteriorGeometry(raidExteriorGeometryRequest(s,nav,'reference',1));for(const [radius,regions] of reference.geometry.regions)assert.deepEqual(createRaidExteriorQuery(s,nav).regionsFor(radius),regions);
 assert.equal(raidExteriorDiagnostics(nav).builds,0);console.log(JSON.stringify({scope:'no Worker eventual geometry-only progress, not deadline acceptance',pumps,steps:prewarmer.stats.steps,maxStepMs:prewarmer.stats.maxStepMs,maxSliceMs:prewarmer.stats.maxSliceMs,maxProofMs:prewarmer.stats.maxProofMs,maxUpdateMs:prewarmer.stats.maxUpdateMs,phases:prewarmer.stats.phases}));prewarmer.dispose();
});
test('camera and group changes do not restart geometry; legal wall edit aborts partial work before adopting fresh geometry',()=>{
 const {s,nav}=fixture(),prewarmer=new RaidExteriorPrewarmer(nav,{createWorker:()=>null});prewarmer.update(s);prewarmer.pump({maxSteps:100,maxMillis:10});assert.equal(prewarmer.status,'working');
 nav.setRaidView({x:88,z:9},{x:88,z:6.5});s.nightPlan={group:['rhino'],at:400,done:false};prewarmer.update(s);assert.equal(prewarmer.stats.jobs,1);assert.equal(prewarmer.stats.aborted,0);
 const wall=s.structures.find(w=>w.kind==='wall'&&!w.gate),key=raidExteriorInputKey(s,nav);assert.ok(Game.removeWall(s,'remove',wall.id,nav));assert.notEqual(raidExteriorInputKey(s,nav),key);prewarmer.update(s);assert.equal(prewarmer.stats.jobs,2);assert.equal(prewarmer.stats.aborted,1);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);
 finish(prewarmer);assert.equal(prewarmer.stats.adopted,1);assert.equal(raidExteriorDiagnostics(nav).builds,0);prewarmer.dispose();
});
test('disposal closes private iterators and late worker replies cannot install graphs',()=>{
 const {s,nav}=fixture(),worker={requests:[],postMessage(data){this.requests.push(data);},terminate(){this.terminated=true;}},prewarmer=new RaidExteriorPrewarmer(nav,{createWorker:()=>worker});prewarmer.update(s);const reply=computeRaidExteriorGeometry(worker.requests[0]);prewarmer.dispose();worker.onmessage({data:reply});assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.equal(prewarmer.status,'disposed');assert.equal(worker.terminated,true);
 const other=new RaidExteriorPrewarmer(nav,{createWorker:()=>null});other.update(s);const iterator=other.pending.iterator;other.pump({maxSteps:2,maxMillis:10});other.dispose();assert.equal(iterator.next().done,true);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);
});
test('owned worker failure changes to real cooperative computation; malformed unowned reply fails without restarting',()=>{
 const {s,nav}=fixture(),worker={postMessage(){throw Error('Transport failed');},terminate(){this.terminated=true;}},prewarmer=new RaidExteriorPrewarmer(nav,{createWorker:()=>worker});prewarmer.update(s);assert.ok(prewarmer.pending.iterator);assert.equal(worker.terminated,true);finish(prewarmer);assert.equal(prewarmer.stats.adopted,1);prewarmer.dispose();
 const bad={requests:[],postMessage(data){this.requests.push(data);},terminate(){}},other=new RaidExteriorPrewarmer(nav,{createWorker:()=>bad});other.update(s);bad.onmessage({data:structuredClone(computeRaidExteriorGeometry(bad.requests[0]))});assert.equal(other.status,'failed');assert.equal(other.stats.rejected,1);other.update(s);assert.equal(bad.requests.length,1);other.dispose();
});
test('real Node worker drains the same geometry iterator and returns exact sync geometry/proof without game mutation',async()=>{
 const {s,nav}=fixture('gran-canon'),before=serialize(s),request=raidExteriorGeometryRequest(s,nav,'native-node-worker',1),worker=new Worker(new URL('../tools/qa-raid-entry-worker-node.mjs',import.meta.url));
 try{const ready=await workerReply(worker);assert.equal(ready.kind,'node-ready');const response=workerReply(worker);worker.postMessage(request);const data=await response,reference=computeRaidExteriorGeometry(request);assert.deepEqual(data,reference);assert.equal(serialize(s),before);console.log(JSON.stringify({scope:'real worker_threads geometry transport/parity, not browser MessageEvent/adoption or frame acceptance',radii:data.geometry.regions.map(p=>p[0]),owner:data.owner,token:data.token}));}
 finally{await worker.terminate();}
});
