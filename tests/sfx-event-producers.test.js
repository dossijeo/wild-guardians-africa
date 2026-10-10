import test from 'node:test';
import assert from 'node:assert/strict';
import {literalEventProducers} from '../tools/sfx-event-producers.mjs';
test('static audit follows both literal raid-wave branches without pretending either executed',()=>{
 const rows=literalEventProducers("emit(s,wave?'RaidWaveSpawned':'RaidSpawned',{raidFacts:{}})");
 assert.deepEqual(rows.map(r=>[r.event,r.branch]),[['RaidWaveSpawned','wave true'],['RaidSpawned','wave false']]);
 assert.ok(rows.every(r=>r.selector.includes("wave?'RaidWaveSpawned':'RaidSpawned'")));
});
test('literal emit remains discoverable and unsupported dynamic expressions stay unproven',()=>{
 assert.equal(literalEventProducers("emit(s,'SpellActivated',{kind})")[0].event,'SpellActivated');
 assert.deepEqual(literalEventProducers('emit(s,kind,{value})'),[]);
 assert.deepEqual(literalEventProducers('emit(s,condition()?a:b,{value})'),[]);
});
