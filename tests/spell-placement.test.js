import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as Game from '../src/simulation/game.js';
import {castPickedSpell,pickedSpellCommand,dispatchPickedSpell,confirmedSpellContact} from '../src/app/spell-placement.js';

test('ground spell contact uses only a confirmed finite terrain sample',()=>{
 const hit={x:1,y:4,z:2};assert.deepEqual(confirmedSpellContact(hit,{x:8,z:9},()=>7),hit);
 assert.deepEqual(confirmedSpellContact(null,{x:8,z:9},()=>7),{x:8,y:7,z:9});
 assert.equal(confirmedSpellContact(null,{x:8,z:9},()=>null),null);
 assert.equal(confirmedSpellContact(null,{x:NaN,z:9},()=>7),null);
});
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function ready(){
  const s=Game.newGame({seed:712,slotId:'picked-spell'});Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:12,z:8},nav);Game.plant(s,'seed','mijo',17,8,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  s.day=5;s.initialPreparation=false;return s;
}
for(const kind of ['shield','growth','multiply'])test(`${kind}: tapping elevated crop covers it instead of terrain behind it`,()=>{
  const s=ready(),p=s.plants[0];
  const origin=new THREE.Vector3(p.x+5,6,p.z+10),top=new THREE.Vector3(p.x,3,p.z);
  const ray=new THREE.Ray(origin,top.clone().sub(origin).normalize());
  const ground=ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
  assert.ok(Math.hypot(ground.x-p.x,ground.z-p.z)>Game.spellRadius(kind));
  castPickedSpell(s,'tap',kind,{entityId:p.id,point:{x:ground.x,z:ground.z}},nav);
  assert.equal(s.spells.length,1);assert.equal(Game.spellAt(s,kind,p),s.spells[0]);
  assert.deepEqual([s.spells[0].x,s.spells[0].z],[p.x,p.z]);
  assert.equal(s.events.filter(e=>e.type==='SpellActivated').length,1);
  assert.equal(s.events.find(e=>e.type==='SpellActivated').commandId,'tap');
  assert.equal(s.cooldowns[kind],kind==='shield'?90:0);if(kind==='multiply')assert.equal(p.multiplyHarvest,true);
  const saved=serialize(s);assert.equal(castPickedSpell(s,'tap',kind,{entityId:p.id,point:null},nav),false);assert.equal(serialize(s),saved);
});
test('agricultural powers require a live plant hit, while Shield keeps free placement',()=>{
 for(const kind of ['growth','multiply']){
  const s=ready();for(const hit of [{entityId:null,point:{x:17,z:8}},{entityId:s.structures[0].id,point:{x:17,z:8}}]){
   const before=serialize(s);assert.equal(castPickedSpell(s,'empty',kind,hit,nav),false);assert.equal(serialize(s),before);
  }
  s.plants[0].alive=false;assert.equal(castPickedSpell(s,'dead',kind,{entityId:s.plants[0].id,point:{x:40,z:50}},nav),false);
 }
 const s=ready();castPickedSpell(s,'shield','shield',{entityId:null,point:{x:40,z:50}},nav);
 assert.deepEqual([s.spells[0].x,s.spells[0].z],[40,50]);
});
for(const kind of ['shield','growth','multiply'])test(`${kind}: transferable command preserves picked target and spell outcome`,()=>{
 const local=ready(),remote=deserialize(serialize(local)),p=local.plants[0],pick={entityId:p.id,point:{x:90,z:90},hitPoint:new THREE.Vector3(p.x,3,p.z),origin:()=>new THREE.Vector3(p.x+5,6,p.z+10)};
 const command=pickedSpellCommand(remote,'transfer',kind,pick);assert.doesNotThrow(()=>structuredClone(command));assert.equal(typeof command.selection.origin,'object');assert.deepEqual(command.selection.origin,{x:p.x+5,y:6,z:p.z+10});
 assert.equal(castPickedSpell(local,'transfer',kind,pick,nav),true);assert.equal(Game.cast(remote,command.id,kind,command.x,command.z,nav,command.selection),true);assert.equal(serialize(remote),serialize(local));
});
test('transferable command retains missing-target behavior and tolerates failed visual placement',()=>{
 const s=ready();assert.equal(pickedSpellCommand(s,'none','growth',{entityId:null,point:{x:1,z:2}}),null);assert.throws(()=>pickedSpellCommand(s,'none','attack',{entityId:'missing'}),/bestia/);
 const command=pickedSpellCommand(s,'shield','shield',{point:{x:40,z:50},origin:()=>{throw Error('visual failure');}});assert.equal(command.selection.origin,null);
});
test('picked spell dispatch waits for the Worker and reports its rejection',async()=>{
 const state=ready(),plant=state.plants[0],sent=[];let resolve;const runtime={submit(command){sent.push(command);return new Promise(r=>{resolve=r;});}},pick={entityId:plant.id,origin:()=>({x:1,y:2,z:3})};
 const pending=dispatchPickedSpell(state,'worker-spell','growth',pick,nav,runtime);assert.equal(sent.length,1);assert.equal(sent[0].kind,'castAgricultural');resolve({value:false,rejection:'No disponible'});await assert.rejects(pending,/No disponible/);
 assert.equal(dispatchPickedSpell(state,'empty','growth',{entityId:null},nav,runtime),false);assert.equal(sent.length,1);
});
test('provisional feedback starts before the Worker resolves and is cancelled on rejection',async()=>{
 const state=ready(),plant=state.plants[0],calls=[];let resolve;
 const runtime={submit(command){calls.push(['submit',command.id]);return new Promise(r=>{resolve=r;});}};
 const presentation={begin:command=>calls.push(['begin',command.id]),reject:id=>calls.push(['reject',id])};
 const pending=dispatchPickedSpell(state,'provisional','growth',{entityId:plant.id},nav,runtime,presentation);
 assert.deepEqual(calls,[['begin','provisional'],['submit','provisional']]);
 resolve({rejection:'No disponible'});await assert.rejects(pending,/No disponible/);
 assert.deepEqual(calls.at(-1),['reject','provisional']);
});
test('downed, recovering and pending targets do not start a provisional attack',async()=>{
 const s=ready();s.day=5;s.time=400;s.elapsed=10;const animal={id:'beast',x:1,z:2,status:'walking',magicDown:{phase:'rolling'}},other={id:'other',x:3,z:4,status:'walking'};s.raid={animals:[animal,other]};
 const calls=[];let resolve;const runtime={submit(command){calls.push(['submit',command.id]);return new Promise(r=>{resolve=r;});}},presentation={begin:c=>calls.push(['begin',c.id]),reject:id=>calls.push(['reject',id])};
 const attack=(id,target)=>dispatchPickedSpell(s,id,'attack',{entityId:target.id,origin:()=>({x:1,y:2,z:3})},nav,runtime,presentation);
 assert.equal(attack('rolling',animal),false);animal.magicDown.phase='recovering';assert.equal(attack('recovering',animal),false);assert.deepEqual(calls,[]);
 delete animal.magicDown;const pending=attack('first',animal);assert.deepEqual(calls,[['begin','first'],['submit','first']]);assert.equal(attack('duplicate',animal),false);assert.equal(attack('other',other),false);
 resolve({value:false,rejection:'No disponible'});await assert.rejects(pending,/No disponible/);assert.equal(calls.at(-1)[0],'reject');
 const next=attack('next',other);resolve({value:true});assert.equal(await next,true);
});
test('a completed provisional gesture permits another target while its first reply is pending',async()=>{
 const s=ready();s.day=5;s.time=400;s.elapsed=10;const a={id:'a',x:1,z:2,status:'walking'},b={id:'b',x:3,z:4,status:'walking'};s.raid={animals:[a,b]};
 const replies=new Map(),begun=[],rejected=[],confirmed=[];let gestureDone=false;const runtime={submit(command){return new Promise(resolve=>replies.set(command.id,resolve));}},presentation={canBeginAttack:()=>gestureDone,begin:command=>begun.push(command.id),reject:id=>rejected.push(id),confirm:id=>confirmed.push(id)};
 gestureDone=true;const first=dispatchPickedSpell(s,'first','attack',{entityId:a.id},nav,runtime,presentation);gestureDone=false;
 assert.equal(dispatchPickedSpell(s,'early','attack',{entityId:b.id},nav,runtime,presentation),false);gestureDone=true;
 assert.equal(dispatchPickedSpell(s,'duplicate','attack',{entityId:a.id},nav,runtime,presentation),false);const second=dispatchPickedSpell(s,'second','attack',{entityId:b.id},nav,runtime,presentation);
 assert.deepEqual(begun,['first','second']);replies.get('first')({value:false,rejection:'No disponible'});await assert.rejects(first,/No disponible/);assert.deepEqual(rejected,['first']);assert.equal(dispatchPickedSpell(s,'duplicate-second','attack',{entityId:b.id},nav,runtime,presentation),false);replies.get('second')({value:true});assert.equal(await second,true);assert.deepEqual(confirmed,['second']);
});
test('presentation-routed attack preserves provisional order and authority rejection',async()=>{
 const s=ready();s.day=5;s.time=400;s.elapsed=10;const animal={id:'beast',x:1,z:2,status:'walking'};s.raid={animals:[animal]};const calls=[],runtime={submit(){throw Error('Unexpected direct dispatch');}},presentation={begin:c=>calls.push(['begin',c.id]),submit:c=>{calls.push(['submit',c.id]);return Promise.resolve({value:false,rejection:'Denied'});},reject:id=>calls.push(['reject',id])};
 await assert.rejects(dispatchPickedSpell(s,'routed','attack',{entityId:animal.id},nav,runtime,presentation),/Denied/);assert.deepEqual(calls,[['begin','routed'],['submit','routed'],['reject','routed']]);
});
