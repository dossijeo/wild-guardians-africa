import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {wallStroke,wallLayout} from '../src/world/wall-layout.js';
import {nativeWallLayout,resample} from '../src/world/wall-layout-native.js';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/wall-layout-native.json',import.meta.url)));
const source=readFileSync(new URL('../'+manifest.source,import.meta.url),'utf8');
const methods=source.slice(source.indexOf(' endpoints(p){'),source.indexOf(' beginCollapse(')).replace('\n closedFaces(){',',\n closedFaces(){').replace('\n ensureAutomaticGates(){',',\n ensureAutomaticGates(){');
const context=vm.createContext({});
vm.runInContext("const UNIT=2.18,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),gateScale=(m,k)=>k==='gate'?({adobe:1.4,piedra:1.4,reforzado:1.6}[m]||1):1;"+source.slice(source.indexOf('function pointSegment('),source.indexOf('class BastionApp'))+'this.sample=resample;this.layout={'+methods+'};',context);
const hp={zarzas:100,empalizada:200,adobe:300,piedra:500,reforzado:400};
const square=[[0,0],[8,0],[8,8],[0,8],[0,0]];
function flat(){const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];return nav;}
function fixture(){const state=Game.newGame({seed:712}),nav=flat();Game.resume(state,'intro');Game.placeStructure(state,'center',{x:-10,z:-10},nav);return {state,nav};}
test('Native wall layout source and extracted module retain their hashes',()=>{
  for(const [file,hash] of [[manifest.source,manifest.sourceSha256],['src/world/wall-layout-native.js',manifest.moduleSha256]])assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash);
});
test('Module sampling preserves original straight, curved and closed paths',()=>{
  for(const points of [[[0,0],[8,0]],[[0,0],[1,4],[5,7],[10,6]],square,[[0,0],[.1,0]]])assert.equal(JSON.stringify(resample(points)),JSON.stringify(context.sample(points)));
  assert.equal(wallStroke([[0,0],[8,0]],[],{smooth:false}).length,4);
  assert.throws(()=>wallStroke([[NaN,0],[8,0]],[]),/inválido/);
});
test('Enclosure graph and deterministic gates match source including crossings and T junctions',()=>{
  const paths=[square,[...square,[8,4],[0,4]],[[0,0],[8,0],[8,8]],[[0,0],[8,8],[0,8],[8,0],[0,0]]];
  for(const path of paths){
    const pieces=resample(path).map((slot,i)=>({id:i+1,material:'adobe',kind:'wall',...slot,hp:300,maxHp:300,visual:1}));
    const native={...context.layout,pieces:structuredClone(pieces),settings:{hp}},actual={...nativeWallLayout,pieces:structuredClone(pieces),settings:{hp}};
    assert.equal(JSON.stringify(actual.closedFaces()),JSON.stringify(native.closedFaces()));
    assert.equal(actual.ensureAutomaticGates(),native.ensureAutomaticGates());assert.equal(JSON.stringify(actual.pieces),JSON.stringify(native.pieces));
    const gates=actual.pieces.filter(p=>p.kind==='gate').map(p=>p.id);actual.ensureAutomaticGates();assert.deepEqual(actual.pieces.filter(p=>p.kind==='gate').map(p=>p.id),gates);
  }
});
test('Paid chain closes with one gate, no surcharge and exactly one idempotent debit',()=>{
  const {state,nav}=fixture();Game.buildWallChain(state,'chain','zarzas',square,nav,{smooth:false,snap:false});
  const walls=state.structures.filter(p=>p.kind==='wall');assert.equal(walls.length,15);assert.equal(walls.filter(p=>p.autoGate).length,1);assert.equal(walls.find(p=>p.autoGate).maxHp,60);assert.equal(state.ledger.balance.n,'550');
  const saved=serialize(state);assert.equal(Game.buildWallChain(state,'chain','zarzas',square,nav),false);assert.equal(serialize(state),saved);assert.equal(serialize(deserialize(saved)),saved);
});
test('Preview never spends coins, reserves IDs or alters the enclosure and construction revalidates it',()=>{
  const {state,nav}=fixture(),before=serialize(state),plan=Game.previewWallChain(state,'zarzas',square,nav,{smooth:false,snap:false});
  assert.equal(plan.cost,150);assert.equal(plan.gates,1);assert.equal(serialize(state),before);
  state.raid={animals:[]};assert.throws(()=>Game.buildWallChain(state,'confirm','zarzas',square,nav),/disponible/);assert.equal(state.ledger.balance.n,'700');assert.equal(state.structures.length,1);
});
test('Invalid terrain, crop intersection and insufficient money leave state unchanged',()=>{
  for(const reason of ['terrain','crop','money']){
    const {state,nav}=fixture();if(reason==='terrain')nav.wallPlacement=()=>({valid:false,reason:'no terreno'});if(reason==='crop')state.plants.push({id:'p',alive:true,x:1,z:0});
    const before=JSON.stringify(state);assert.throws(()=>Game.buildWallChain(state,'chain',reason==='money'?'piedra':'zarzas',square,nav,{smooth:false,snap:false}));assert.equal(JSON.stringify(state),before);
  }
});
test('Removing an automatic gate opens a persistent gap without refund or replacement',()=>{
  const {state,nav}=fixture();Game.buildWallChain(state,'chain','zarzas',square,nav,{smooth:false,snap:false});const gate=state.structures.find(p=>p.autoGate),balance=state.ledger.balance.n;
  Game.removeWall(state,'remove',gate.id,nav);assert.equal(state.ledger.balance.n,balance);assert.equal(state.structures.filter(p=>p.autoGate).length,0);
  const loaded=deserialize(serialize(state));assert.equal(wallLayout(loaded.structures,hp).closedFaces().length,0);assert.equal(loaded.structures.length,state.structures.length);
  Game.buildWallChain(state,'other','zarzas',[[20,20],[22,20]],nav,{smooth:false,snap:false});assert.equal(state.structures.filter(p=>p.autoGate).length,0);
});
test('No global 240-module cap; shortened modules affect both sampled and swept obstacles',()=>{
  const nav=flat(),state=Game.newGame();state.structures=Array.from({length:260},(_,i)=>({id:'w'+i,created:i,kind:'wall',material:'zarzas',x:100+i*4,z:100,yaw:0,hp:100,maxHp:100,status:'intact'}));
  assert.equal(wallStroke([[0,0],[8,0]],state.structures,{smooth:false}).length,4);
  state.structures=[{id:'short',kind:'wall',material:'adobe',baseScaleX:.3,x:0,z:0,yaw:0,status:'intact'}];nav.setState(state);
  assert.equal(nav.walkable(.8,0,.1),true);assert.equal(nav.walkable(0,0,.1),false);
  assert.equal(nav.segmentClear({x:.8,z:-1},{x:.8,z:1},.1),true);
});
test('Malformed persisted module scale and automatic gate flags are rejected',()=>{
  const {state,nav}=fixture();Game.buildWallChain(state,'chain','zarzas',[[0,0],[8,0]],nav,{smooth:false});const wall=state.structures.find(p=>p.kind==='wall');
  wall.baseScaleX=0;assert.throws(()=>serialize(state),/defensa/);wall.baseScaleX=1;wall.autoGate='yes';assert.throws(()=>serialize(state),/defensa/);
});
test('No-center and raid restrictions reject chains and removal without mutating money or modules',()=>{
  for(const mode of ['no-center','raid']){
    const {state,nav}=fixture();if(mode==='no-center')state.structures=[];else state.raid={animals:[]};
    const before=JSON.stringify(state);assert.throws(()=>Game.buildWallChain(state,'chain','zarzas',square,nav));assert.equal(JSON.stringify(state),before);
    assert.throws(()=>Game.removeWall(state,'remove','nonexistent',nav));assert.equal(JSON.stringify(state),before);
  }
});
test('Night and live raids reject individual walls, gates, preview and stale chains without changing navigation or campaign',()=>{
  for(const mode of ['night','day-raid','night-raid']){
    const {state,nav}=fixture();nav.setState(state);
    // A real paid preview exists before the permission changes.
    const plan=Game.previewWallChain(state,'zarzas',square,nav,{smooth:false,snap:false});
    assert.equal(plan.cost,150);
    if(mode!=='day-raid')state.time=300;
    if(mode!=='night')state.raid={animals:[{id:'qa-live-beast',x:0,z:-4,status:'approaching',hp:100}]};
    const before=JSON.stringify(state),route=nav.path({x:0,z:-4},{x:0,z:4},.28),walkable=nav.walkable(0,0,.28);
    assert.ok(route,'the animal corridor is initially open');
    const commands=[
      ()=>Game.placeStructure(state,'single',{kind:'wall',material:'zarzas',x:0,z:0},nav),
      ()=>Game.placeStructure(state,'gate',{kind:'wall',material:'zarzas',gate:true,x:0,z:0},nav),
      ()=>Game.previewWallChain(state,'zarzas',square,nav,{smooth:false,snap:false}),
      ()=>Game.buildWallChain(state,'stale','zarzas',square,nav,{smooth:false,snap:false})
    ];
    for(const command of commands){
      assert.throws(command,/Esta acción no está disponible ahora/);
      assert.equal(JSON.stringify(state),before,'no debit, IDs, suppression, animal or geometry changes');
      assert.equal(nav.walkable(0,0,.28),walkable);
      assert.deepEqual(nav.path({x:0,z:-4},{x:0,z:4},.28),route,'no new obstacle blocks the animal corridor');
    }
  }
});
test('Removing a reserved repair releases its worker and preserves the ledger',()=>{
  const {state,nav}=fixture();Game.buildWallChain(state,'chain','zarzas',[[0,0],[4,0]],nav,{smooth:false,snap:false});const wall=state.structures.find(p=>p.kind==='wall');
  const worker={id:'qa-worker',taskId:'qa-task',status:'acting',path:[{x:1,z:0}],taskApproach:{x:1,z:0}};
  state.workers.push(worker);state.tasks.push({id:'qa-task',targetId:wall.id,workerId:worker.id});const balance=state.ledger.balance.n;
  Game.removeWall(state,'remove',wall.id,nav);assert.equal(worker.taskId,null);assert.equal(worker.taskApproach,null);assert.equal(worker.path,null);assert.equal(worker.status,'idle');assert.equal(state.tasks.length,0);assert.equal(state.ledger.balance.n,balance);
});
