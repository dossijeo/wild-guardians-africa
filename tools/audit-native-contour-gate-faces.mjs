// Read-only reconstruction of the same solid/terrain graph used by native gates.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {wallLayout,wallStroke,WALL_UNIT} from '../src/world/wall-layout.js';
import {boundaryEdges} from '../src/world/boundary-gates.js';
import {boundaryFaces} from '../src/world/boundary-faces.js';
import {containsPoint} from '../src/world/footprints.js';
import {BALANCE} from '../src/simulation/balance.js';
import * as Game from '../src/simulation/game.js';
const [input,output,replayInput,replayReport]=process.argv.slice(2);
assert(input&&output&&!existsSync(output));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json';
const nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(s);
const before=serialize(s);
function topology(s,nav,omitted=[]){
const layout=wallLayout(s.structures,Object.fromEntries(BALANCE.walls.map(w=>[w.id,w.hp])));
const edges=boundaryEdges(layout,nav).concat(omitted),virtual=edges.map(([a,b],i)=>({id:-i-1,kind:'boundary',material:'',hp:1,maxHp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT}));
const gates=layout.pieces.filter(p=>p.kind==='gate');
const faces=boundaryFaces([...layout.pieces,...virtual]).map((face,index)=>{
 const polygon=face.polygon.map(([x,z])=>({x,z}));
 return {...face,index,gateIds:gates.filter(p=>face.ids.includes(p.id)).map(p=>p.entityId),cropIds:s.plants.filter(p=>p.alive&&containsPoint(polygon,p.x,p.z)).map(p=>p.id)};
});
return {gates:gates.map(p=>({id:p.entityId,created:p.id,x:p.x,z:p.z,faces:faces.filter(f=>f.ids.includes(p.id)).map(f=>f.index)})),faces,facesWithMultipleGates:faces.filter(f=>f.gateIds.length>1).map(f=>f.index)};
}
const current=topology(s,nav),history=[];
if(replayInput||replayReport){
 assert(replayInput&&replayReport);
 const opening=deserialize(gunzipSync(readFileSync(replayInput)).toString()),report=JSON.parse(readFileSync(replayReport));
 const replayNav=new Navigation(opening.seed,opening.biome,JSON.parse(readFileSync(profilePath)).profile);replayNav.setState(opening);
 let command=0;
 for(let i=0;i<report.decisions.length;i++){
  const d=report.decisions[i];assert(Math.abs(opening.time-d.time)<1e-8);
  if(d.actions){
   const omitted=wallStroke(report.policy.completed.points,opening.structures,{smooth:false,snap:false}).filter(slot=>!replayNav.wallPlacement({kind:'wall',material:report.parameters.material,gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle}).valid).map(slot=>{const h=WALL_UNIT*slot.scaleX/2,dx=Math.cos(slot.angle)*h,dz=Math.sin(slot.angle)*h;return [[slot.x-dx,slot.z-dz],[slot.x+dx,slot.z+dz]];});
   assert(Game.buildWallChain(opening,'small-funded-wall-'+command++,report.parameters.material,report.policy.completed.points,replayNav,{smooth:false,snap:false,maxPieces:d.lastHistory.paidPieces}));
   history.push({time:opening.time,pieces:opening.structures.filter(p=>p.kind==='wall').length,...topology(opening,replayNav),omittedEdges:omitted,conversionGraph:topology(opening,replayNav,omitted)});
  }
  if(i<report.decisions.length-1)Game.tick(opening,5,replayNav);
 }
 // Compare the persisted representation; serialization canonicalizes -0 yaw.
 const restored=deserialize(serialize(opening));
 assert.deepEqual(restored.structures,s.structures);assert.deepEqual(restored.ledger,s.ledger);
}
assert.equal(serialize(s),before);assert.equal(hash(readFileSync(input)),hash(bytes));
const sources=['tools/audit-native-contour-gate-faces.mjs','src/world/boundary-gates.js','src/world/boundary-faces.js','src/world/wall-layout.js','src/world/navigation.js',profilePath];
const result={input,inputSha256:hash(bytes),...current,history,replayInput:replayInput??null,replayReport:replayReport??null,replayHashes:replayInput?{input:hash(readFileSync(replayInput)),report:hash(readFileSync(replayReport))}:null,stateUnchangedAfterNavigationSetup:true,sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),scope:'Current native graph reconstruction and optional native command replay with exact final structures and ledger; not worker connectivity or visual acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({gates:result.gates,faces:result.faces.map(f=>({index:f.index,area:f.area,gateIds:f.gateIds,crops:f.cropIds.length})),history:history.map(h=>({pieces:h.pieces,gates:h.gates,conversionFaces:h.conversionGraph.faces.map(f=>({index:f.index,area:f.area,gateIds:f.gateIds,crops:f.cropIds.length}))})),facesWithMultipleGates:result.facesWithMultipleGates}));
