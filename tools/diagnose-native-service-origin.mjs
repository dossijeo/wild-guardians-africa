// Read-only geometry diagnosis. Never accepts a defense plan or buys walls.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {agriculturalRayClear} from '../src/simulation/raid-agricultural-impact.js';
const [diagnostic,output]=process.argv.slice(2);
if(!diagnostic||!output||existsSync(output))throw Error('Requires retained failed perimeter diagnostic and fresh output');
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
assert.ok(serialize(s)===before,'Diagnostic must preserve native state, RNG and ledger');
const files=[biomeFile,'tools/diagnose-native-service-origin.mjs','src/world/navigation.js','src/simulation/raid-agricultural-impact.js','src/world/wall-layout.js'];
const result={input:prior.input,inputSha256:createHash('sha256').update(snapshot).digest('hex'),priorDiagnostic:diagnostic,priorDiagnosticSha256:createHash('sha256').update(readFileSync(diagnostic)).digest('hex'),sourceHashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),targetId:target.id,target:{x:target.x,z:target.z},point,radius,outside:check.outside,proposed,withoutProposedWalls,scope:'Exact retained failed pose and nine native lattice origin queries, with and without proposed unpaid walls. Read-only diagnosis, not a perimeter certificate, paid protection, continuous-space proof or economic result.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
