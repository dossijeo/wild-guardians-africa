import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {cameraRaidEntry,nearFarmRaidEntry,reachableApproach} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {wallLayout,wallStroke} from '../src/world/wall-layout.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {raidEntryKey,raidEntryRequest} from '../src/world/raid-entry-data.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function paidEnclosureEntryDiagnostic(){
 const started=performance.now(),provenance=JSON.parse(readFileSync(new URL('../docs/qa/horde-self-consistent-pilot-e040ea6f-20/native-original/provenance.json',import.meta.url)));
 for(const[p,h]of Object.entries(provenance.sourceHashes))assert.equal(hash(readFileSync(new URL('../'+p,import.meta.url))),h,'Source changed: '+p);
 const{s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'saheliana',slotId:'paid-enclosure-entry-diagnostic'}),center=s.structures[0],bounds=[center.x+2,center.z+6.2,center.x+9,center.z+17];
 const [x0,z0,x1,z1]=bounds,points=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],inside=p=>p.x>x0&&p.x<x1&&p.z>z0&&p.z<z1;
 assert.equal(Game.plant(s,'enclosure-crop','mijo',center.x+5,center.z+9,nav),true);
 const preview=Game.previewWallChain(s,'zarzas',points,nav,{smooth:false,snap:false});assert.equal(preview.pieces.length,17);assert.equal(wallStroke(points,s.structures,{smooth:false,snap:false}).length,17);assert.equal(preview.gates,1);
 assert.equal(Game.buildWallChain(s,'enclosure-walls','zarzas',points,nav,{smooth:false,snap:false}),true);assert.equal(numberOf(s.ledger.entries['enclosure-walls']),-170);
 Game.openInitialHiring(s);Game.hire(s,'enclosure-hire',{olderFemale:1});assert.equal(numberOf(s.ledger.entries['enclosure-hire']),-30);assert.equal(numberOf(s.ledger.balance),495);
 const walls=s.structures.filter(p=>p.kind==='wall');assert.equal(walls.length,17);assert.equal(wallLayout(walls,{}).closedFaces().length,1);assert.ok(inside(s.plants[0]));assert.equal(s.time,0);assert.equal(s.elapsed,0);assert.equal(s.rng,deserialize(serialize(s)).rng);
 const species='warthog',radius=ANIMAL_ACTIONS.animals[species].presentation.footprint.radius,specs=[{spec:animalSpec(species),radius}],group=[species],stateBefore=serialize(s),results=[];
 for(const [id,eye,target]of [['inside-camera',{x:center.x+5,z:center.z+9},center],['outside-camera',{x:center.x+5,z:center.z+20},center],['inside-crop-target',{x:center.x+5,z:center.z+9},{x:center.x+5,z:center.z+6.5}]]){
  nav.setRaidView(eye,target);nav.setActiveBounds(activeChunkRegion(eye).bounds);const activeBounds=nav.activeBounds;
  const camera=cameraRaidEntry(s,specs,activeBounds,nav),nearFarm=nearFarmRaidEntry(s,specs,activeBounds,nav),key=raidEntryKey(s,nav,group),prepared=computeRaidEntry(raidEntryRequest(s,nav,group,key,1));assert.equal(prepared.key,key);
  const descriptions={};for(const [name,entry]of Object.entries({camera,nearFarm,prepared:prepared.entry})){
   descriptions[name]=entry?{entries:entry.entries.map(p=>({...p,inside:inside(p),distanceToCamera:Math.hypot(p.x-eye.x,p.z-eye.z)})),exits:entry.exits.map(p=>({...p,inside:inside(p)})),routes:entry.entries.map((p,i)=>{const actor={id:'entry-readonly-'+i,species,...p,radius,status:'entering',hitsRemaining:1};return {entryWalkable:nav.walkable(p.x,p.z,radius,null,false),exitWalkable:nav.walkable(entry.exits[i].x,entry.exits[i].z,radius,null,false),escapeForward:nav.segmentClear(p,entry.exits[i],radius,null,false),escapeReverse:nav.segmentClear(entry.exits[i],p,radius,null,false),cropAttack:!!reachableApproach(actor,s.plants[0],nav),wallAttackIds:walls.filter(w=>reachableApproach(actor,w,nav)).map(w=>w.id)};})}:null;
  }
  results.push({id,eye,viewTarget:{x:target.x,z:target.z},operationalCenter:{x:center.x,z:center.z},activeBounds,radius,descriptions,preparedWarmth:prepared.warmth?{version:prepared.warmth.version}:null});assert.equal(serialize(s),stateBefore,'Entry preparation changed simulation/RNG');
 }
 const checks={centerTargetInternalCameraEntry:results[0].descriptions.camera?.entries[0].inside===true,centerTargetInternalPreparedEntry:results[0].descriptions.prepared?.entries[0].inside===true,nearFarmInternalEntry:results[0].descriptions.nearFarm?.entries[0].inside===true,outsideCameraCandidate:results[1].descriptions.camera?.entries[0].inside===false,cropTargetInternalCameraEntry:results[2].descriptions.camera?.entries[0].inside===true,cropTargetInternalPreparedEntry:results[2].descriptions.prepared?.entries[0].inside===true};
 return {scope:'Independent paid Sabana/Saheliana seed712 closed crop enclosure, pure entry selection/precalculation at native day1time0; not historical Canyon reconstruction, raid traversal or balance acceptance',checks,source:provenance.gitHead,sourceCount:Object.keys(provenance.sourceHashes).length,stateSHA256:hash(stateBefore),snapshot:JSON.parse(stateBefore),paid:{centre:800,crop:5,walls:170,hire:30,balance:495},closedFaces:1,nominalAndPaidPieces:17,gates:1,bounds,species,radius,snapshotUnchangedByEntry:true,results,milliseconds:performance.now()-started,unknowns:['No actual raid spawned or moved; recorded entries are selected candidates, not historical campaign poses','Alternate outside camera is an ordinary presentation position, not a correction implemented in production','Closed face/paid complete slots do not guarantee every species cannot use every gate/state','Single species, seed, biome/culture; original negative perimeter probes remain separate']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=paidEnclosureEntryDiagnostic();writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,snapshot:undefined,results:result.results.map(r=>({id:r.id,radius:r.radius,entries:Object.fromEntries(Object.entries(r.descriptions).map(([k,v])=>[k,v?.entries])),routes:r.descriptions.camera?.routes})),unknowns:undefined}));}
