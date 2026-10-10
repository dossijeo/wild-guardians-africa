import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {exteriorCandidate,runProbe} from '../tools/probe-exterior-raid-entry.mjs';
import {enclosureFixture} from '../tools/probe-camera-enclosure.mjs';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';

test('isolated exterior candidate preserves RNG, state and view and separates the complete epic group',()=>{
 const {s,nav}=enclosureFixture(8),before=JSON.stringify(s),view=nav.raidView;
 const group=['warthog','hyena','buffalo','lion','rhino'],specs=group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 const {entry,method,envelope}=exteriorCandidate(s,specs,nav.activeBounds,0,nav);
 assert.equal(method,'projected-exterior-camera');assert.equal(JSON.stringify(s),before);assert.equal(nav.raidView,view);
 for(let i=0;i<entry.entries.length;i++){
  const p=entry.entries[i],r=specs[i].radius;
  assert.ok(p.x-r>envelope[2]||p.x+r<envelope[0]||p.z-r>envelope[3]||p.z+r<envelope[1]);
  assert.ok(nav.segmentClear(p,entry.exits[i],r,null,false));
  for(let j=0;j<i;j++)assert.ok(Math.hypot(p.x-entry.entries[j].x,p.z-entry.entries[j].z)>r+specs[j].radius+1);
 }
});

test('first native hit changes from crop to wall in the controlled enclosure',()=>{
 const original=runProbe(),candidate=runProbe({candidate:true});
 assert.equal(original.firstHit?.type,'CropHit');assert.equal(candidate.firstHit?.type,'StructureHit');
 assert.ok(candidate.births.every(a=>!a.insideSquare));
 assert.ok(candidate.targets.every(a=>a.kind==='wall'));
});

test('near-cardinal and diagonal headings keep the projected entry bounded',()=>{
 for(const heading of [.001,Math.PI/4,Math.PI/2+.001,Math.PI*1.25]){
  const {s,nav}=enclosureFixture(8);nav.setRaidView({x:Math.sin(heading)*8,z:Math.cos(heading)*8},{x:0,z:0});
  const specs=[{radius:ANIMAL_ACTIONS.animals.warthog.presentation.footprint.radius}],r=exteriorCandidate(s,specs,nav.activeBounds,0,nav);
  assert.ok(r.entry);assert.notEqual(r.method,'active-edge-fallback');
  assert.ok(Math.hypot(r.entry.entries[0].x,r.entry.entries[0].z)<45);
 }
});

test('retained candidate evidence covers four headings and complete group with current source hashes',()=>{
 const r=JSON.parse(readFileSync(new URL('../docs/qa/retained-raid-entry-audit/exterior-candidate.json',import.meta.url)));
 assert.equal(r.rows.length,9);
 for(const row of r.rows.slice(0,8)){
  assert.equal(row.firstHit.type,row.candidate?'StructureHit':'CropHit');
  assert.ok(row.births.every(a=>a.insideSquare===!row.candidate));
 }
 assert.equal(r.rows.at(-1).births.length,5);assert.ok(r.rows.at(-1).births.every(a=>!a.insideSquare));
 for(const [path,sha] of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),sha);
});
