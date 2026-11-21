import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame} from '../src/simulation/game.js';
import {deserialize,serialize,validateSnapshot} from '../src/persistence/snapshots.js';

test('real saved world round-trips and rejects generated identity counter rollback',()=>{
 const original=deserialize(readFileSync('docs/guardian/phase2/performance-components/native-raid-snapshot.json','utf8')),restored=deserialize(serialize(original));assert.equal(restored.nextId,original.nextId);assert.equal(restored.sequence,original.sequence);
 const victim=[...restored.plants,...restored.structures,...restored.workers,...restored.crates,...restored.tasks,...restored.villages,...restored.spells,...restored.people].find(item=>/^(?:plant|structure|person|worker|crate|spell|task|village|animal)-\d+$/.test(item.id));assert.ok(victim);const index=Number(victim.id.match(/-(\d+)$/)[1]),rolled=structuredClone(restored);rolled.nextId=index;assert.throws(()=>validateSnapshot(rolled),/Contador de entidad incoherente/);
});
test('animal ids participate in uniqueness and generated counter checks while legacy arbitrary ids remain valid',()=>{
 const state=newGame({seed:712});state.raid={id:'r',animals:[{id:'animal-2',x:0,z:0,status:'walking'}]};state.nextId=3;validateSnapshot(state);
 const duplicate=structuredClone(state);duplicate.raid.animals.push({...duplicate.raid.animals[0]});assert.throws(()=>validateSnapshot(duplicate),/Identidad duplicada/);
 const overlap=structuredClone(state);overlap.raid.animals[0].id=overlap.villages[0].id;assert.throws(()=>validateSnapshot(overlap),/Identidad duplicada/);
 const rollback=structuredClone(state);rollback.nextId=2;assert.throws(()=>validateSnapshot(rollback),/Contador de entidad incoherente/);
 const legacy=structuredClone(state);legacy.raid.animals[0].id='legacy-elephant';legacy.nextId=2;assert.equal(deserialize(serialize(legacy)).raid.animals[0].id,'legacy-elephant');
});
test('generated event and notice ids must precede the saved sequence',()=>{const state=newGame({seed:713});state.events.push({id:'event-1',type:'Example'});state.sequence=1;assert.throws(()=>validateSnapshot(state),/Contador de eventos incoherente/);state.sequence=2;validateSnapshot(state);state.messages.push({id:'message-2',text:'hello',target:null});assert.throws(()=>validateSnapshot(state),/Contador de eventos incoherente/);state.messages[0].id='legacy-message';validateSnapshot(state);state.events.push({...state.events[0]});assert.throws(()=>validateSnapshot(state),/Identidad duplicada/);});
test('generated active raid matches its day, phase and completed source plan',()=>{const state=newGame({seed:714});state.raid={id:'raid-1-day',daytime:true,animals:[]};state.dayPlan={at:100,done:true};validateSnapshot(state);const unfinished=structuredClone(state);unfinished.dayPlan.done=false;assert.throws(()=>validateSnapshot(unfinished),/Plan de incursión incoherente/);const wrongDay=structuredClone(state);wrongDay.raid.id='raid-2-day';assert.throws(()=>validateSnapshot(wrongDay),/Plan de incursión incoherente/);const wrongPhase=structuredClone(state);wrongPhase.raid.daytime=false;assert.throws(()=>validateSnapshot(wrongPhase),/Plan de incursión incoherente/);const legacy=structuredClone(state);legacy.raid.id='legacy-raid';legacy.dayPlan.done=false;validateSnapshot(legacy);const noDayPlan=structuredClone(state);delete noDayPlan.dayPlan;assert.throws(()=>validateSnapshot(noDayPlan),/Plan de incursión incoherente/);const night=structuredClone(state);night.raid.id='raid-1-night';night.raid.daytime=false;night.nightPlan={done:true};validateSnapshot(night);delete night.nightPlan;assert.throws(()=>validateSnapshot(night),/Plan de incursión incoherente/);});
