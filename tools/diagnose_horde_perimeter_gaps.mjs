import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const readJson=p=>JSON.parse(readFileSync(p,'utf8'));
export function diagnosePerimeter(original){
 const started=performance.now(),provenance=readJson(original+'/provenance.json');
 for(const[p,h]of Object.entries(provenance.sourceHashes))assert.equal(hash(readFileSync(new URL('../'+p,import.meta.url))),h,'Frozen source changed: '+p);
 const bytes=gunzipSync(readFileSync(original+'/responsible/state.json.gz')),state=deserialize(bytes.toString()),report=JSON.parse(gunzipSync(readFileSync(original+'/responsible/report.json.gz'))),before=serialize(state),built=report.defense.built;
 assert.equal(before,bytes.toString());assert.equal(built.expectedPieces,128);assert.equal(built.pieces,103);
 const profile=readJson(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url)).profile,nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 const owned=new Set(built.ids),actual=state.structures.filter(w=>owned.has(w.id)),slots=wallStroke(built.points,[],{smooth:false,snap:false});assert.equal(slots.length,built.expectedPieces);
 const radii=Object.fromEntries(Object.entries(ANIMAL_ACTIONS.animals).map(([id,a])=>[id,a.presentation.footprint.radius]));
 const cropOverlap=piece=>{const c=Math.cos(piece.yaw),sn=Math.sin(piece.yaw);return state.plants.filter(p=>p.alive&&Math.abs((p.x-piece.x)*c-(p.z-piece.z)*sn)<1.09*piece.baseScaleX+.4&&Math.abs((p.x-piece.x)*sn+(p.z-piece.z)*c)<.22+.4).map(p=>p.id);};
 const gaps=[];for(const [index,slot]of slots.entries()){
  if(actual.some(p=>Math.hypot(p.x-slot.x,p.z-slot.z)<1e-7))continue;
  const piece={kind:'wall',material:report.defense.material,gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle},check=nav.wallPlacement(piece),plants=cropOverlap(piece),crossings={};
  for(const[species,radius]of Object.entries(radii)){
   const distance=radius+.5,dx=Math.sin(piece.yaw)*distance,dz=Math.cos(piece.yaw)*distance,a={x:piece.x-dx,z:piece.z-dz},b={x:piece.x+dx,z:piece.z+dz};
   const aWalkable=nav.walkable(a.x,a.z,radius,null,false),bWalkable=nav.walkable(b.x,b.z,radius,null,false);crossings[species]={radius,a,b,aWalkable,bWalkable,forward:aWalkable&&bWalkable&&nav.segmentClear(a,b,radius,null,false),reverse:aWalkable&&bWalkable&&nav.segmentClear(b,a,radius,null,false)};
  }
  gaps.push({index,piece,terminalNativeWallPlacement:check,terminalCropOverlapIds:plants,crossings});
 }
 assert.equal(gaps.length,25);
 const inside=p=>p&&p.x>=built.bounds[0]&&p.x<=built.bounds[2]&&p.z>=built.bounds[1]&&p.z<=built.bounds[3],raidDays=new Map(report.raids.map(r=>[r.id,r.day]));
 const observedAttacks=report.raidFacts.filter(e=>['AnimalLogicalHit','AnimalLogicalMiss'].includes(e.type)&&(raidDays.get(e.raidId)??0)>=built.day).map(e=>({eventId:e.id,raidId:e.raidId,day:raidDays.get(e.raidId),animalId:e.animalId,targetId:e.targetId,species:e.species,type:e.type,presentation:e.presentation??null,actorInside:inside(e.presentation?.animal),targetInside:inside(e.presentation?.target)}));
 const reasonCounts={};for(const g of gaps){const reason=g.terminalNativeWallPlacement.valid?'Placement valid at terminal':g.terminalNativeWallPlacement.reason;reasonCounts[reason]=(reasonCounts[reason]??0)+1;}
 const crossings=Object.fromEntries(Object.keys(radii).map(id=>[id,gaps.filter(g=>g.crossings[id].forward&&g.crossings[id].reverse).length]));
 assert.equal(serialize(state),before,'Diagnostic mutated native snapshot');
 return {scope:'Read-only terminal gap attribution and local native reversible crossings, not reconstruction of day10 omission causes or actual complete raid routes',source:provenance.gitHead,sourceCount:Object.keys(provenance.sourceHashes).length,inputHashes:{state:hash(bytes),report:hash(readFileSync(original+'/responsible/report.json.gz'))},snapshotUnchanged:true,built:{day:built.day,time:built.time,bounds:built.bounds,expected:slots.length,owned:actual.length,gaps:gaps.length},reasonCounts,localReversibleCrossingCounts:crossings,observedAttackCounts:{total:observedAttacks.length,targetInside:observedAttacks.filter(e=>e.targetInside===true).length,targetOutside:observedAttacks.filter(e=>e.targetInside===false).length,missingTargetPosition:observedAttacks.filter(e=>e.targetInside==null).length,actorInside:observedAttacks.filter(e=>e.actorInside===true).length},gaps,observedAttacks,milliseconds:performance.now()-started,unknowns:['Construction-time native rejection receipts and pre-construction snapshot were not retained','Final plants/suppressions/gate state differ from construction time; terminal classifications are not exact historical cause','Complete actor movement paths were not retained; attack coordinates and physical terminal exits cannot reconstruct paths','Local perpendicular crossing proves only that segment at terminal state, not entry-to-target reachability or protection','No enclosure correction, gameplay commands, A-star path searches, clock advancement, RNG draws, money or source mutations']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=diagnosePerimeter(process.argv[2]);writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({reasons:result.reasonCounts,crossings:result.localReversibleCrossingCounts,attacks:result.observedAttackCounts,milliseconds:result.milliseconds}));}
