import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {applyEvent} from '../src/simulation/events.js';
import {createPlant} from '../src/simulation/crops.js';
import {agriculturalDawnMessage} from '../src/ui/agricultural-notice.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

test('dawn announcement follows the actual applied event through save/load, not unrelated notices',()=>{
 const s=Game.newGame({seed:712,slotId:'dawn-notice'});s.day=2;
 s.plants.push(createPlant('plant','mijo',6,0,'center'));
 s.eventPlan={id:'season',kind:'season',negative:false,magnitude:.2};applyEvent(s);
 const text=s.messages.at(-1).text;Game.notice(s,'Partida guardada.');
 assert.equal(agriculturalDawnMessage(s),text);assert.equal(agriculturalDawnMessage(deserialize(serialize(s))),text);
 s.day++;assert.equal(agriculturalDawnMessage(s),null);
});
test('no announcement is invented before application or after the notice is evicted',()=>{
 const s=Game.newGame({seed:712,slotId:'missing-notice'});s.eventPlan={kind:'season',magnitude:.2,negative:false};
 assert.equal(agriculturalDawnMessage(s),null);s.plants.push(createPlant('plant','mijo',6,0,'center'));applyEvent(s);
 for(let i=0;i<8;i++)Game.notice(s,'Otro aviso');assert.equal(agriculturalDawnMessage(s),null);
});
