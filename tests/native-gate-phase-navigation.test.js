import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {BIOME_IDS} from '../src/world/navigation.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {serialize} from '../src/persistence/snapshots.js';

for(const biome of Object.keys(BIOME_IDS))for(const culture of Game.CULTURES)test(`${biome}/${culture}: native hostile gate geometry is invariant across animation phases`,()=>{
 const {s:state,nav}=createOpeningWorld({seed:712,biome,culture,slotId:'gate-phase'});
 const center=state.structures[0];
 let point;
 for(let dz=-48;dz<=48&&!point;dz+=4)for(let dx=-48;dx<=48&&!point;dx+=4){
  const x=center.x+dx,z=center.z+dz;
  const gate={kind:'wall',material:'empalizada',gate:true,x,z,yaw:0};
  if(nav.walkable(x,z,1.6,null,false)&&nav.wallPlacement(gate).valid)point={x,z};
 }
 assert(point,'A native legal gate placement must exist');
 Game.placeStructure(state,'qa-gate',{kind:'wall',material:'empalizada',gate:true,...point,yaw:0},nav);
 const gate=state.structures.find(w=>w.gate);assert(gate);
 const radii=[...new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))];
 let expected;
 for(const phase of [0,.25,.5,.75,1]){
  // Controlled diagnostic input, not movement or a player action. Refresh the
  // native graph so stale obstacle snapshots cannot hide a phase dependency.
  gate.gateOpen=phase;nav.setState(state);const before=serialize(state);
  const rows=radii.map(radius=>({radius,center:nav.walkable(point.x,point.z,radius,null,false),
   cross:nav.segmentClear({x:point.x,z:point.z-4},{x:point.x,z:point.z+4},radius,null,false),
   side:nav.segmentClear({x:point.x-4,z:point.z},{x:point.x+4,z:point.z},radius,null,false)}));
  assert(rows.every(r=>!r.center&&!r.cross&&!r.side),'Hostile bodies cannot pass the gate footprint');
  if(expected)assert.deepEqual(rows,expected);else expected=rows;
  assert.equal(serialize(state),before,'Read-only queries must not alter paid state');
 }
});
