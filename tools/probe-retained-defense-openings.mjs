// Read-only witnesses of traversable perimeter openings in retained snapshots.
// No A*, no simulation ticks, no assumed protection from wall purchase counts.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {serialize} from '../src/persistence/snapshots.js';
import {loadCohort} from './probe-cohort-connectivity.mjs';
import {wallStroke} from '../src/world/wall-layout.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
export function probeRetainedDefense(kind){
 const {state,nav,inputSha}=loadCohort(kind),before=serialize(state);
 const path=`docs/qa/native-economic-balance/pilot-77cfb1ac-${kind}-712/partial.json`,raw=readFileSync(path),partial=JSON.parse(raw);
 const bounds=partial.receipts.defense.history.at(-1).bounds,[x0,z0,x1,z1]=bounds,center={x:(x0+x1)/2,z:(z0+z1)/2};
 const slots=wallStroke([[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],[],{smooth:false,snap:false}),probes=[];
 const inside=(p,r)=>p.x-r>x0&&p.x+r<x1&&p.z-r>z0&&p.z+r<z1;
 const outside=(p,r)=>p.x+r<x0||p.x-r>x1||p.z+r<z0||p.z-r>z1;
 for(const [species,rule] of Object.entries(ANIMAL_ACTIONS.animals))for(const slot of slots){
  const radius=rule.presentation.footprint.radius;let nx=-Math.sin(slot.angle),nz=Math.cos(slot.angle);
  if(nx*(center.x-slot.x)+nz*(center.z-slot.z)<0){nx=-nx;nz=-nz;}
  const from={x:slot.x+nx*(radius+2),z:slot.z+nz*(radius+2)},to={x:slot.x-nx*(radius+2),z:slot.z-nz*(radius+2)};
  const endpointsOnOppositeSides=inside(from,radius)&&outside(to,radius);
  const fromWalkable=nav.walkable(from.x,from.z,radius,null,false),toWalkable=nav.walkable(to.x,to.z,radius,null,false);
  const segmentClear=endpointsOnOppositeSides&&fromWalkable&&toWalkable&&nav.segmentClear(from,to,radius,null,false);
  probes.push({species,radius,slot,from,to,endpointsOnOppositeSides,fromWalkable,toWalkable,segmentClear:!!segmentClear});
 }
 assert.equal(serialize(state),before,'Read-only defense probe changed native snapshot');
 return {kind,inputSha,defenseReceiptSha256:createHash('sha256').update(raw).digest('hex'),day:state.day,time:state.time,bounds,
  purchasedPieces:partial.receipts.defense.paidPieces,nominalSlots:slots.length,stateUnchanged:true,
  testedSegments:probes.length,openWitnesses:probes.filter(p=>p.segmentClear).length,probes,
  scope:'Full-radius native clear segments crossing the latest intended rectangle, in a fixed original snapshot. An open witness proves a local traversable gap. Zero witnesses does not prove global enclosure, gate usefulness, attacker route arrival or protection. No commands, RNG draws, clock advance or repaired geometry.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const out=process.argv[2];if(!out||existsSync(out))throw Error('Explicit new output directory required');
 const cases=['good','expansive'].map(probeRetainedDefense);mkdirSync(out,{recursive:true});
 writeFileSync(out+'/witnesses.json',JSON.stringify({cases},null,2)+'\n');
 console.log(JSON.stringify(cases.map(({probes,...r})=>r)));
}
