import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {topologyFixture,connectedCandidate,exteriorWitness} from '../tools/probe-raid-entry-topology.mjs';
import {cameraRaidEntry} from '../src/simulation/raids.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const specs=[{radius:ANIMAL_ACTIONS.animals.warthog.presentation.footprint.radius}];
test('exterior witnesses preserve nearby entries through openings and between separate enclosures',()=>{
 for(const shape of ['open','separate','no-walls']){
  const {s,nav}=topologyFixture(shape),before=JSON.stringify(s),view=nav.raidView;
  const original=cameraRaidEntry(s,specs,nav.activeBounds,nav),r=connectedCandidate(s,specs,nav.activeBounds,0,nav);
  assert.equal(r.method,'unchanged-native-exterior-witness');assert.deepEqual(r.entry,original);
  assert.equal(JSON.stringify(s),before);assert.equal(nav.raidView,view);
  for(const w of r.witnesses)for(const proof of [w.birth,w.exit])assert.ok(proof);
 }
});
test('closed and concave walls including animal-blocking gate do not provide a false exterior witness',()=>{
 for(const shape of ['closed','concave','gate']){
  const {s,nav}=topologyFixture(shape),r=connectedCandidate(s,specs,nav.activeBounds,0,nav);
  assert.equal(r.method,'projected-exterior-camera');assert.ok(r.entry);
  const original=cameraRaidEntry(s,specs,nav.activeBounds,nav);
  assert.notDeepEqual(r.entry,original);
 }
 // A path that bends is not disproved by a failed direct witness.
 assert.equal(exteriorWitness({x:0,z:0},1,[-10,-10,10,10],{segmentClear:()=>false}),null);
});
test('clipped active bounds remain an explicit failure instead of accepting an interior spawn',()=>{
 const {s,nav}=topologyFixture('clipped-bounds'),r=connectedCandidate(s,specs,nav.activeBounds,0,nav);
 assert.equal(r.entry,null);assert.equal(r.method,'active-edge-fallback');
});
test('retained paired topology results cover actual native first impacts and current sources',()=>{
 const data=JSON.parse(readFileSync(new URL('../docs/qa/retained-raid-entry-audit/topology-candidates.json',import.meta.url)));
 assert.equal(data.rows.length,21);
 for(const shape of ['closed','concave','gate']){
  assert.equal(data.rows.find(r=>r.shape===shape&&r.kind==='production').firstHit,'CropHit');
  assert.equal(data.rows.find(r=>r.shape===shape&&r.kind==='connected').firstHit,'StructureHit');
 }
 for(const shape of ['open','separate','no-walls']){
  const a=data.rows.find(r=>r.shape===shape&&r.kind==='production'),b=data.rows.find(r=>r.shape===shape&&r.kind==='connected');
  assert.deepEqual(a.entry,b.entry);assert.equal(b.firstHit,'CropHit');
 }
 for(const [p,sha] of Object.entries(data.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex'),sha);
});
