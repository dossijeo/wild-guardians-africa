import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {closedDefenseContours} from '../tools/native-closed-defense-policy.mjs';
import {obstacleAwareContour} from '../tools/native-obstacle-aware-contour.mjs';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {nativePerimeterProof} from '../tools/native-perimeter-proof.mjs';
import * as Game from '../src/simulation/game.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {hitStructure} from '../src/simulation/rules.js';

const source=new URL('../docs/qa/native-economic-balance/pilot-funded-5985791f-q8-good-day6-712-7/state.json.gz',import.meta.url);
function snapshot(){
 const bytes=readFileSync(source),s=deserialize(gunzipSync(bytes).toString());
 const {nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture});nav.setState(s);
 Game.hire(s,'routed-diagnostic-paid-hire',{olderFemale:11});
 return {s,nav,bytes};
}
test('bounded native contour routes around real obstacles without modifying the retained campaign',()=>{
 const {s,nav,bytes}=snapshot(),before=serialize(s),c=closedDefenseContours(s)[0];
 const a=obstacleAwareContour(s,nav,c),b=obstacleAwareContour(s,nav,c);assert(a.candidate);assert.deepEqual(a,b);
 const q=Game.quoteWallChain(s,'zarzas',a.candidate.points,nav,{smooth:false,snap:false});
 assert.equal(q.pieces.length,wallStroke(a.candidate.points,s.structures,{smooth:false,snap:false}).length);
 assert.equal(q.pieces.length,74);assert.equal(q.cost,740);assert.equal(q.gates,1);
 assert.equal(serialize(s),before);assert.deepEqual(readFileSync(source),bytes);
 // This is a prospective collision view, never a paid campaign outcome.
 const view=nav.forBuildingPlacement({id:'proposal-only',x:1e12,z:1e12,radius:0,kind:'house'});
 view.obstacles=[...nav.obstacles,...q.pieces];
 const crop=s.plants.find(p=>p.alive),bounds=a.candidate.bounds;
 for(const radius of new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))){
  const outside={x:bounds[2]+6,z:crop.z};
  assert.equal(view.approachPath(outside,crop,radius,32),null);
 }
});
test('routed savings uses actual cash and cannot promote proposed walls into live protection',()=>{
 const {s,nav}=snapshot(),before=serialize(s),p=createNativeFundedDefensePolicy({obstacleAware:true});
 assert.equal(p.act(s,nav,{command:k=>'routed-'+k,reserve:330}),0);
 const r=p.report();assert.equal(r.remainingCost,740);assert.equal(r.paidPieces,0);assert.equal(r.completed,null);
 assert(r.history[0].attempts.some(a=>a.routed&&a.legal));assert.equal(serialize(s),before);
});
test('native perimeter proof rejects an open quote instead of claiming isolation from a bounded path failure',()=>{
 const {s,nav}=snapshot(),candidate=closedDefenseContours(s)[0],before=serialize(s);
 assert.equal(nativePerimeterProof(s,nav,{pieces:[],updates:[]},candidate.bounds).valid,false);
 assert.equal(serialize(s),before);
});

test('cached predictive queries recheck crop extent and invalidate native geometry epochs',()=>{
 const {s,nav}=snapshot(),c=closedDefenseContours(s)[0],route=obstacleAwareContour(s,nav,c).candidate;
 const plan=Game.quoteWallChain(s,'zarzas',route.points,nav,{smooth:false,snap:false}),before=serialize(s);
 assert.deepEqual(nativePerimeterProof(s,nav,plan,route.bounds),nativePerimeterProof(s,nav,plan,route.bounds,{cache:false}));
 assert.deepEqual(nativePerimeterProof(s,nav,plan,route.bounds),nativePerimeterProof(s,nav,plan,route.bounds,{cache:false}));
 assert.equal(serialize(s),before);
 // Diagnostic geometry edits are confined to this clone, not a campaign.
 const first=s.plants.find(p=>p.alive),x=first.x;first.x=route.bounds[2]+10;
 assert.deepEqual(nativePerimeterProof(s,nav,plan,route.bounds),nativePerimeterProof(s,nav,plan,route.bounds,{cache:false}));first.x=x;
 nav.setState(s);
 assert.deepEqual(nativePerimeterProof(s,nav,plan,route.bounds),nativePerimeterProof(s,nav,plan,route.bounds,{cache:false}));
 const changed={...plan,pieces:plan.pieces.slice(1)};
 assert.deepEqual(nativePerimeterProof(s,nav,changed,route.bounds),nativePerimeterProof(s,nav,changed,route.bounds,{cache:false}));
});
test('routed policy retains real partial purchases and native gate creation in an affordable opening',()=>{
 const {s,nav}=createOpeningWorld(),center=s.structures[0];
 Game.plant(s,'routed-first-seed','mijo',center.x+6,center.z+1,nav);Game.openInitialHiring(s);Game.hire(s,'routed-hire',{olderFemale:1});
 const p=createNativeFundedDefensePolicy({startDay:1,obstacleAware:true});let id=0;
 for(let i=0;i<20&&!p.report().completed;i++){p.act(s,nav,{command:k=>`routed-${k}-${id++}`,reserve:160});Game.tick(s,5,nav);}
 const r=p.report();assert(r.completed);assert(r.paidPieces>0);assert.equal(r.paidCost,r.paidPieces*10);
 assert.equal(s.structures.filter(w=>w.gate).length,1);
 for(const row of r.history.filter(r=>r.paidCost))assert(s.ledger.entries[row.paymentId]);
 assert.equal(p.reserve(s),0);
});

test('damage to a paid enclosing wall requests native maintenance instead of buying a second perimeter',()=>{
 const {s,nav}=createOpeningWorld(),c=s.structures[0];
 Game.plant(s,'maintain-seed','mijo',c.x+6,c.z+1,nav);Game.openInitialHiring(s);Game.hire(s,'maintain-hire',{olderFemale:1});
 const p=createNativeFundedDefensePolicy({startDay:1,obstacleAware:true});let id=0;
 const options={command:k=>`maintain-${k}-${id++}`,reserve:30};
 for(let i=0;i<20&&!p.report().completed;i++){p.act(s,nav,options);Game.tick(s,5,nav);}
 assert(p.report().completed);
 const before=p.report().paidCost,pieces=p.report().paidPieces,wall=s.structures.find(w=>w.kind==='wall'&&!w.gate);
 assert(hitStructure(wall,wall.maxHp,s.elapsed));nav.setState(s);Game.tick(s,5,nav);
 p.act(s,nav,options);
 assert.equal(p.report().paidCost,before);assert.equal(p.report().paidPieces,pieces);
 assert.equal(p.report().history.at(-1).reason,'maintaining-paid-native-contour');
 assert(s.tasks.some(t=>t.kind==='repair'&&t.targetId===wall.id)||wall.status==='collapsing');
 assert.equal(p.report().history.at(-1).complete,false);
});
