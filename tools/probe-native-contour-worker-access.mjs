// Diagnose a rejected retained contour without approving it or editing a farm.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {centerServicePoint,centerDeliveryPoint} from '../src/world/centers.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
import * as Game from '../src/simulation/game.js';
const [snapshotPath,contoursPath,indexText,output]=process.argv.slice(2),index=Number(indexText);
assert(snapshotPath&&contoursPath&&output&&!existsSync(output)&&Number.isSafeInteger(index)&&index>=0,'Retained inputs, candidate index and fresh output required');
const hash=b=>createHash('sha256').update(b).digest('hex'),snapshot=readFileSync(snapshotPath),contoursBytes=readFileSync(contoursPath),contours=JSON.parse(contoursBytes);
assert.equal(hash(snapshot),contours.inputSha256,'Contour and snapshot do not correspond');
const row=contours.rows[index];assert(row?.candidate&&row.proof?.reason==='native-worker-route-blocked','Select an actual rejected worker-route candidate');
const s=deserialize(gunzipSync(snapshot).toString('utf8')),before=serialize(s);
const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json','utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const quote=Game.quoteWallChain(s,'zarzas',row.candidate.points,nav,{smooth:false,snap:false});
assert.equal(quote.cost,row.quote.cost);assert.equal(quote.pieces.length,row.quote.count);
const makeView=suppress=>{
 const view=nav.forBuildingPlacement({id:'qa-empty-proposal',x:1e12,z:1e12,radius:0,kind:'house'},suppress);
 const updates=new Map(quote.updates.map(q=>[q.id,q]));
 view.obstacles=[...nav.obstacles.map(w=>updates.has(w.id)?{...w,...updates.get(w.id)}:w),...quote.pieces];return view;
};
const views=[['original',nav],['quoted-obstacles',makeView([])],['quoted-obstacles-and-suppression',makeView(quote.suppressed??[])]];
const results=[],cropServices=[],began=performance.now();
for(const [name,view] of views){
 const destination=s.plants.find(p=>p.alive&&view.walkable(p.x,p.z,.28,null,true));assert(destination);
 const origins=[...s.workers.filter(w=>!w.incapacitated&&w.status!=='home').map(w=>({id:w.id,type:'live-worker',x:w.x,z:w.z,status:w.status})),
  ...s.structures.filter(c=>c.kind==='center'&&c.status==='intact').map(c=>({id:c.id,type:'centre-service',...centerServicePoint(c,s,.8)}))];
 for(const origin of origins){
  const at=performance.now(),startBodyValid=view.walkable(origin.x,origin.z,.28,null,true),path=view.path(origin,destination,.28,null,true,32);
  const actor=s.workers.find(w=>w.id===origin.id)??{...origin,radius:.28},water=wateringRoute(actor,destination,view);
  if(water)assert(canWaterFrom({...water.destination,radius:actor.radius??.28},destination,view));
  results.push({view:name,origin,destination:{id:destination.id,x:destination.x,z:destination.z},startBodyValid,
   routeFound:!!path,pathPoints:path?.length??0,wateringRouteFound:!!water,wateringDestination:water?.destination??null,cpuMilliseconds:performance.now()-at});
 }
 for(const plant of s.plants.filter(p=>p.alive)){
  const center=s.structures.find(c=>c.id===plant.centerId);assert(center,'Living crop has no associated centre');
  const start=centerServicePoint(center,s,.8),water=wateringRoute({...start,radius:.28},plant,view);
  if(water)assert(canWaterFrom({...water.destination,radius:.28},plant,view));
  const delivery=centerDeliveryPoint(center,plant,s,.8),returnPath=water?view.path(water.destination,delivery,.28,null,true,32):null;
  cropServices.push({view:name,plantId:plant.id,centerId:center.id,wateringRouteFound:!!water,
   deliveryRouteFound:!!returnPath,wateringDestination:water?.destination??null,deliveryDestination:delivery});
 }
}
assert.equal(serialize(s),before,'Read-only diagnostic changed native state');
const files=['tools/probe-native-contour-worker-access.mjs','public/content/biome-'+BIOME_IDS[s.biome]+'.json','src/world/navigation.js','src/world/centers.js','src/world/work-points.js','src/simulation/game.js'];
const result={snapshotPath,snapshotSha256:hash(snapshot),contoursPath,contoursSha256:hash(contoursBytes),index,
 rejectedReason:row.proof.reason,quote:{cost:quote.cost,pieces:quote.pieces.length,suppressed:quote.suppressed??[]},
 sourceHashes:Object.fromEntries(files.map(p=>[p,hash(readFileSync(p))])),cpuMilliseconds:performance.now()-began,stateUnchanged:true,results,cropServices,
 scope:'Static centre-point and native watering-service routes to each view\'s first body-valid living crop; all living crops additionally checked for associated-centre watering and return routes to the nearest delivery edge. Compares live worker and centre origins, and quoted suppression. A bounded failure does not prove inaccessibility. No paid construction, movement, task execution, perimeter approval, campaign replay or GPU benchmark.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({index,stateUnchanged:true,rows:results.length,summary:results.map(r=>({view:r.view,id:r.origin.id,type:r.origin.type,startBodyValid:r.startBodyValid,routeFound:r.routeFound,wateringRouteFound:r.wateringRouteFound}))}));
