import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import * as THREE from 'three';
import {wallStages,morphedWallPositions} from '../src/rendering/walls-native.js';
import {NativeWall,wallBridge} from '../src/rendering/walls.js';
import * as Game from '../src/simulation/game.js';
import {hitStructure} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {transact,rational,numberOf} from '../src/simulation/money.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/walls-native.json',import.meta.url)));
const source=readFileSync(new URL('../'+manifest.source,import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function regionalEase('),source.indexOf('const MORPH_VS='))+'this.renderer={'+source.slice(source.indexOf(' stages(p){'),source.indexOf(' drawPieces('))+','+source.slice(source.indexOf(' morphedPositions(mesh,morph){'),source.indexOf(' pick(x,y,pieces'))+'};',context);
const pack=JSON.parse(readFileSync(new URL('../public/content/walls.json',import.meta.url)));
const array=(p,type)=>{const buffer=readFileSync(new URL('../public'+p.url,import.meta.url));return new type(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));};
const pieces=Object.fromEntries(Object.entries(pack.pieces).map(([key,p])=>[key,{p:array(p.p,Float32Array),n:array(p.n,Float32Array),uv:array(p.uv,Float32Array),i:array(p.i,Uint16Array),faceRegions:array(p.faceRegions,Uint16Array),regions:p.regions,morph:Object.fromEntries(Object.entries(p.morph).map(([key,m])=>[key,{p:array(m.p,Float32Array),n:array(m.n,Float32Array),peers:m.peers}]))}]));
test('Native Bastion extraction preserves source and module hashes',()=>{
  for(const [file,hash] of [[manifest.source,manifest.sourceSha256],['src/rendering/walls-native.js',manifest.moduleSha256]])assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash);
});
test('All materials and gate stages agree with the original native renderer',()=>{
  for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])for(const kind of ['wall','gate'])for(let i=0;i<=100;i++){
    const p={material,kind,visual:i/100};assert.equal(JSON.stringify(wallStages(p)),JSON.stringify(context.renderer.stages(p)));
  }
});
test('Every original regional bridge keeps triangle pivots and exact native trajectories',()=>{
  for(const [key,p] of Object.entries(pieces))for(const [destination,bridge] of Object.entries(p.morph)){
    const mesh=wallBridge(p,bridge),native={...mesh,lastMorph:NaN,morphed:null};
    for(let i=0;i<=20;i++){
      const actual=morphedWallPositions(mesh,i/20),expected=context.renderer.morphedPositions(native,i/20);
      assert.equal(actual.length,expected.length);assert.ok(actual.every((value,index)=>value===expected[index]),key+'>'+destination+' phase '+i);
    }
    for(let face=0;face<p.i.length/3;face++){
      const root=p.regions[p.faceRegions[face]].root;
      for(let j=0;j<3;j++)assert.deepEqual([...mesh.roots.subarray((face*3+j)*3,(face*3+j+1)*3)],root.map(Math.fround));
    }
    assert.ok([...morphedWallPositions(mesh,1)].every(Number.isFinite));
  }
});
function prototypes(){return Object.fromEntries(Object.entries(pieces).map(([key,p])=>{
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial());mesh.userData.nativePiece=p;return [key,mesh];
}));}
test('Production wall renders opaque native rubble, preserves gate scale and disposes private geometry',()=>{
  const proto=prototypes(),entity={id:'wall',material:'reforzado',gate:true,hp:240,maxHp:240,status:'intact'};
  const wall=new NativeWall(proto,entity),before=JSON.stringify(entity),first=wall.parts[0].mesh;let disposed=false;first.geometry.addEventListener('dispose',()=>disposed=true);
  assert.equal(wall.scale.x,1.6);assert.equal(wall.parts.length,1);
  entity.hp=120;wall.update(entity);assert.ok(disposed);assert.equal(wall.parts.length,2);
  for(const {mesh} of wall.parts){assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.depthWrite,true);assert.ok(mesh.geometry.boundingSphere.radius>0);}
  entity.status='ruined';entity.hp=0;wall.update(entity);assert.equal(wall.parts.length,1);assert.equal(wall.scale.y,1.6);assert.match(wall.stageKey,/reforzado_destruido/);
  const saved=JSON.stringify(entity);wall.update(entity);assert.equal(JSON.stringify(entity),saved);assert.notEqual(saved,before);
  wall.dispose();assert.equal(wall.children.length,0);assert.ok(proto.reforzado_puerta.material.isMaterial);
});
test('Collapse follows simulated remainder and reconstructs correctly after loading or repair',()=>{
  const proto=prototypes(),entity={id:'wall',material:'adobe',gate:false,hp:60,maxHp:300,status:'collapsing',collapseRemaining:.7};
  const wall=new NativeWall(proto,entity);assert.ok(Math.abs(wall.visual-.1)<1e-10);
  const loaded=new NativeWall(proto,structuredClone(entity));assert.equal(loaded.visual,wall.visual);
  entity.hp=300;entity.status='intact';entity.collapseRemaining=0;wall.update(entity);assert.equal(wall.visual,1);assert.match(wall.stageKey,/adobe_intacto/);
  wall.dispose();loaded.dispose();
});
test('Ordinary damage uses native 480 ms cubic easing, pauses hold it and collapse overrides it',()=>{
  const entity={id:'wall',material:'piedra',gate:false,hp:500,maxHp:500,status:'intact'},wall=new NativeWall(prototypes(),entity);
  entity.hp=250;wall.update(entity,0);assert.equal(wall.visual,1);
  wall.update(entity,.24);assert.equal(wall.visual,.5625);
  wall.update(entity,0);assert.equal(wall.visual,.5625);
  wall.update(entity,.24);assert.equal(wall.visual,.5);
  entity.hp=100;entity.status='collapsing';entity.collapseRemaining=1.4;wall.update(entity,0);assert.equal(wall.visual,.5);
  entity.collapseRemaining=.7;wall.update(entity,.7);assert.equal(wall.visual,.25);
  wall.dispose();
});
test('Articulated leaves retain finite native damage bridges and reconstruct the original closed pose',()=>{
  for(const material of ['zarzas','empalizada','reforzado']){
    const entity={id:'gate',material,gate:true,hp:60,maxHp:60,status:'intact',gateOpen:0},wall=new NativeWall(prototypes(),entity),closed=wall.parts[0].mesh.geometry.attributes.position.array.slice();
    for(const ratio of [1,.9,.5,.21])for(const opening of [0,.25,.5,1]){
      entity.hp=60*ratio;entity.gateOpen=opening;wall.update(entity);
      for(const {mesh} of wall.parts){assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite));assert.equal(mesh.material.transparent,false);}
    }
    entity.status='ruined';entity.hp=0;wall.update(entity);assert.match(wall.stageKey,/destruido/);
    entity.status='intact';entity.hp=60;entity.gateOpen=0;wall.update(entity);assert.deepEqual(wall.parts[0].mesh.geometry.attributes.position.array,closed);wall.dispose();
  }
});

// Recreate the renderer from a real snapshot, not another copy first created
// halfway through collapse. This catches dependence on the old renderer's fade.
test('wall/gate damage and collapse geometry resume identically in a fresh renderer after snapshot reload',()=>{
 for(const material of ['zarzas','empalizada','adobe','reforzado','piedra'])for(const gate of [false,true]){
  const s=Game.newGame({seed:712,slotId:'wall-visual-reload'}),nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:-20,z:-20},nav);Game.placeStructure(s,'wall',{kind:'wall',material,gate,x:0,z:0},nav);s.tutorial.step='done';s.initialPreparation=false;s.time=320;s.nightPlan={at:320,done:true,group:[]};
  const e=s.structures.at(-1),live=new NativeWall(prototypes(),e,s.elapsed);
  const equalReload=()=>{const before=serialize(s),copy=deserialize(before),restored=new NativeWall(prototypes(),copy.structures.at(-1),copy.elapsed);assert.equal(restored.visual,live.visual,material+' gate='+gate+' visual at '+s.elapsed);assert.equal(restored.stageKey,live.stageKey);for(let i=0;i<live.parts.length;i++){assert.deepEqual(restored.parts[i].mesh.geometry.attributes.position.array,live.parts[i].mesh.geometry.attributes.position.array);assert.deepEqual(restored.parts[i].mesh.geometry.attributes.normal.array,live.parts[i].mesh.geometry.attributes.normal.array);}assert.equal(serialize(s),before,'rendering must not mutate persisted presentation');restored.dispose();};
  hitStructure(e,e.maxHp*.4,s.elapsed);live.update(e,0,s.elapsed);Game.tick(s,.24,nav);live.update(e,.24,s.elapsed);equalReload();
  hitStructure(e,e.maxHp*.4,s.elapsed);live.update(e,0,s.elapsed);Game.tick(s,.35,nav);live.update(e,.35,s.elapsed);equalReload();
  Game.pause(s,'qa');const paused=live.visual;Game.tick(s,20,nav);live.update(e,0,s.elapsed);assert.equal(live.visual,paused);equalReload();Game.resume(s,'qa');
  Game.tick(s,1.05,nav);live.update(e,1.05,s.elapsed);assert.equal(e.status,'ruined');equalReload();live.dispose();
 }
});

test('paid physical wall/gate repairs and ruin rebuilding retain their ascending native fade in a fresh renderer',()=>{
 // Explicit QA funding covers all prices; movement/payment use production tasks.
 for(const material of ['zarzas','empalizada','adobe','reforzado','piedra'])for(const gate of [false,true])for(const ruined of [false,true]){
  const s=Game.newGame({seed:712,slotId:'repair-visual-reload'}),nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];Game.resume(s,'intro');
  transact(s.ledger,'qa-repair-funding',rational(200));Game.placeStructure(s,'center',{x:10,z:0},nav);Game.placeStructure(s,'wall',{kind:'wall',material,gate,x:35,z:0},nav);Game.plant(s,'crop','mijo',20,10,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});s.tutorial.step='done';s.dayPlan.done=true;
  const e=s.structures.at(-1),live=new NativeWall(prototypes(),e,s.elapsed);hitStructure(e,e.maxHp*.2,s.elapsed);live.update(e,0,s.elapsed);Game.tick(s,.5,nav);live.update(e,.5,s.elapsed);assert.equal(live.visual,.8);if(ruined){hitStructure(e,e.hp,s.elapsed);Game.tick(s,1.4,nav);live.update(e,1.4,s.elapsed);assert.equal(e.status,'ruined');assert.equal(live.visual,0);}
  const balance=numberOf(s.ledger.balance),price={zarzas:10,empalizada:20,adobe:35,reforzado:55,piedra:80}[material],expected=ruined?price:Math.ceil(price*.2);Game.requestRepair(s,'repair',e.id);assert.equal(numberOf(s.ledger.balance),balance);for(let i=0;i<3000&&!s.events.some(x=>x.type==='RepairApplied');i++){Game.tick(s,.05,nav);live.update(e,.05,s.elapsed);}assert.ok(s.events.some(x=>x.type==='RepairApplied'),material+' repair must reach the wall physically');assert.ok(live.visual<1&&live.visual>=(ruined?0:.8),'BAST repair must retain its ascending 480 ms fade');assert.equal(numberOf(s.ledger.balance),balance-expected);const payments=Object.entries(s.ledger.entries).filter(([id])=>id.startsWith('repair:'));assert.equal(payments.length,1);assert.equal(numberOf(payments[0][1]),-expected);
  for(const dt of [0,.1,.38]){Game.tick(s,dt,nav);live.update(e,dt,s.elapsed);const stored=serialize(s),copy=deserialize(stored),restored=new NativeWall(prototypes(),copy.structures.at(-1),copy.elapsed);assert.equal(restored.visual,live.visual,material+' gate='+gate+' repair fade at '+s.elapsed);assert.equal(restored.stageKey,live.stageKey);for(let i=0;i<live.parts.length;i++)assert.deepEqual(restored.parts[i].mesh.geometry.attributes.position.array,live.parts[i].mesh.geometry.attributes.position.array);assert.equal(serialize(s),stored);restored.dispose();}
  assert.equal(e.hp,e.maxHp);assert.equal(live.visual,1);assert.equal(s.events.filter(x=>x.type==='RepairApplied').length,1);live.dispose();
 }
});
