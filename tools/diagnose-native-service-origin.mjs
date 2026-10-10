// Read-only geometry diagnosis. Never accepts a defense plan or buys walls.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativeServiceComponentProof} from './native-service-component-proof.mjs';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {operational} from '../src/simulation/rules.js';
import {centerFootprint} from '../src/world/centers.js';
import {agriculturalRayClear} from '../src/simulation/raid-agricultural-impact.js';
const [diagnostic,output,mode='one-origin']=process.argv.slice(2);
if(!diagnostic||!output||existsSync(output)||!['one-origin','all-targets'].includes(mode))throw Error('Requires retained failed perimeter diagnostic and fresh output');
const prior=JSON.parse(readFileSync(diagnostic)),snapshot=readFileSync(prior.input),s=deserialize(gunzipSync(snapshot).toString()),before=serialize(s);
const biomeFile=`public/content/biome-${BIOME_IDS[s.biome]}.json`,profile=JSON.parse(readFileSync(biomeFile)).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const first=prior.rows.find(r=>r.proof?.checks?.some(c=>c.services?.reason==='native-service-origin-unproven'));
assert.ok(first,'No retained empty-origin service pose');
const check=first.proof.checks.find(c=>c.services?.reason==='native-service-origin-unproven'),point=check.services.point,radius=check.radius,target=s.plants.find(p=>p.id===check.services.targetId);
assert.ok(target?.alive);const quote=Game.quoteWallChain(s,'zarzas',first.candidate.points,nav,{smooth:false,snap:false});
assert.equal(quote.pieces.length,first.quote.count);assert.equal(quote.cost,first.quote.cost);
const updates=new Map(quote.updates.map(q=>[q.id,q]));
const proposal=nav.forBuildingPlacement({id:'qa-service-origin-proposal',x:1e12,z:1e12,radius:0,kind:'house'});
proposal.obstacles=[...nav.obstacles.map(w=>updates.has(w.id)?{...w,...updates.get(w.id)}:w),...quote.pieces];
function examine(view){
 const origins=[];
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const node={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz},bodyClear=view.walkable(node.x,node.z,radius,null,false),segmentClear=view.segmentClear(point,node,radius,null,false);
  origins.push({...node,bodyClear,segmentClear,usable:bodyClear&&segmentClear,centerOnWater:view.field.fluidInside(node.x,node.z)});
 }
 const direct=view.segmentClear(point,check.outside,radius,null,false);
 // This is diagnostic only: a null bounded route is not a closure certificate.
 const approach=view.approachPath(check.outside,point,radius,32);
 return {pointBodyClear:view.walkable(point.x,point.z,radius,null,false),pointCanHitCrop:agriculturalRayClear(s,view,point,target),directToExterior:direct,nativeApproachFound:!!approach,nativeOriginNodes:origins,usableNativeOrigins:origins.filter(p=>p.usable).length};
}
const proposed=examine(proposal),withoutProposedWalls=examine(nav);
const targetAudit=[];
if(mode==='all-targets'){
 const targets=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational)],land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
 assert.ok(targets.length<=1000,'Retained diagnostic target count exceeds bounded QA scope');
 const radii=[...new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))].sort((a,b)=>b-a);
 for(const r of radii){
  assert.ok(proposal.walkable(check.outside.x,check.outside.z,r,null,false),'Exterior probe must remain physically valid');
  const groupBlocked=proposal.approachGroupBlocked(check.outside,land,r,.6+r);
  for(const t of targets){
   const services=nativeServiceComponentProof(s,proposal,[t],r,check.outside,first.candidate.points);
   targetAudit.push({targetId:t.id,kind:t.kind??'crop',radius:r,groupBlocked,services});
  }
 }
}
assert.ok(serialize(s)===before,'Diagnostic must preserve native state, RNG and ledger');
const files=['tools/native-service-component-proof.mjs','src/simulation/animal-actions-data.js','src/world/centers.js',biomeFile,'tools/diagnose-native-service-origin.mjs','src/world/navigation.js','src/simulation/raid-agricultural-impact.js','src/world/wall-layout.js'];
const result={input:prior.input,inputSha256:createHash('sha256').update(snapshot).digest('hex'),priorDiagnostic:diagnostic,priorDiagnosticSha256:createHash('sha256').update(readFileSync(diagnostic)).digest('hex'),sourceHashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),mode,targetAudit,targetId:target.id,target:{x:target.x,z:target.z},point,radius,outside:check.outside,proposed,withoutProposedWalls,scope:'Exact retained failed pose and nine native lattice origin queries, with and without proposed unpaid walls. Read-only diagnosis, not a perimeter certificate, paid protection, continuous-space proof or economic result.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');const reasons={};for(const q of targetAudit)reasons[q.services.reason]=(reasons[q.services.reason]??0)+1;console.log(JSON.stringify({mode,proposedUsableOrigins:proposed.usableNativeOrigins,naturalUsableOrigins:withoutProposedWalls.usableNativeOrigins,targetChecks:targetAudit.length,reasons}));
