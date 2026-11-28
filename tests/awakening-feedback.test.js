import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {awakeningState,evaluateAwakeningDay,startAwakeningDay} from '../src/simulation/awakenings.js';
import {createPlant} from '../src/simulation/crops.js';
import {applyCropImpact} from '../src/simulation/crop-impact-health.js';
import {retireFarmHistory} from '../src/simulation/retire-farm-history.js';
import {eventCardSpec,eventCardDetail} from '../src/ui/event-cards.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {translate} from '../public/i18n/catalog.js';

test('blessing feedback reuses event cards and keeps a location after the destroyed entity is retired',()=>{
  const s=Game.newGame({seed:712,slotId:'awakening-feedback'});
  s.structures.push({id:'center',kind:'center',status:'intact',hp:100,maxHp:100,x:10,z:10});
  s.plants.push(createPlant('plant-2','maiz',4,5,'center'));awakeningState(s).progress=100;
  Game.bless(s,'bless','plant-2');assert.equal(s.messages.at(-1).category,'awakening-applied');
  const p=s.plants[0];for(let i=0;i<2;i++){const hit=applyCropImpact(s,p,1);Game.emit(s,'CropHit',{targetId:p.id,...hit});}
  const lost=s.messages.at(-1);assert.equal(lost.category,'awakening-lost');assert.deepEqual(lost.location,{x:4,z:5});
  assert.equal(eventCardSpec(lost).urgent,true);assert.equal(eventCardSpec(lost).asset,'magic_icon');
  assert.equal(s.messages.filter(m=>m.category==='awakening-threat').length,1);assert.equal(s.messages.filter(m=>m.category==='awakening-lost').length,1);
  retireFarmHistory(s);assert.equal(s.plants.length,0);
  const loaded=deserialize(serialize(s));assert.deepEqual(loaded.messages.at(-1).location,{x:4,z:5});
  loaded.messages.at(-1).location.x=NaN;assert.throws(()=>serialize(loaded),/Ubicación de aviso/);
});
test('three effective good days report the streak inside one daily summary and cannot repeat it after evaluation',()=>{
  const s=Game.newGame({seed:712}),notices=[];
  s.structures.push({kind:'center',status:'intact',hp:100});
  for(let day=1;day<=3;day++){
    s.day=day;startAwakeningDay(s);Object.assign(s.awakenings.current,{opportunity:2,productive:2,delivered:80,seedBasis:20,wages:30,exposed:10,threat:1});
    evaluateAwakeningDay(s,{notice:(text,metadata)=>notices.push({text,metadata})});
  }
  assert.equal(notices.length,3);assert.equal(notices.filter(n=>n.text.includes('Racha de tres')).length,1);
  assert.equal(notices[2].metadata.category,'awakening-day');
  assert.equal(evaluateAwakeningDay(s,{notice:()=>{throw Error('duplicate dawn feedback');}}),null);
});
test('new HUD, daily category and target descriptions participate in the existing bilingual catalog',()=>{
  assert.equal(translate('Despertar','en'),'Awaken');
  assert.equal(translate('Energía de Despertar: 78 de 100','en'),'Awakening energy: 78 of 100');
  assert.equal(translate('Bendición permanente','en'),'Permanent blessing');
  assert.equal(translate('Magia bajo amenaza','es'),'Magia bajo amenaza');
  assert.ok(translate('Elige una planta viva o una sección de muralla en pie.','en').startsWith('Choose a living plant'));
});
test('compact tutorial alerts retain the original saved message and identify the threatened object',()=>{
  const plant={category:'awakening-lost',text:'Una fuente mágica ha sido destruida. Sus cultivos pierden la influencia.'};
  const wall={category:'awakening-threat',text:'Una muralla mágica está bajo ataque. ¡Protégela!'};
  assert.equal(eventCardDetail(plant,true),'Fuente perdida; su influencia cesa.');
  assert.equal(eventCardDetail(wall,true),'¡Muralla mágica bajo ataque!');
  assert.equal(eventCardDetail(plant,false),plant.text);
  assert.match(plant.text,/ha sido destruida/);
});
