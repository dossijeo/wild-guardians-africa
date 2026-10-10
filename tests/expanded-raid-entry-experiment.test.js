import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expandedCandidate,requiredEntryChunks} from '../tools/probe-expanded-raid-entry.mjs';
import {topologyFixture} from '../tools/probe-raid-entry-topology.mjs';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const specs=[{radius:ANIMAL_ACTIONS.animals.warthog.presentation.footprint.radius}];
test('current selector finds an exterior entry without unnecessary QA expansion or changing live state',()=>{
 const {s,nav}=topologyFixture('clipped-bounds'),before=JSON.stringify(s),bounds=nav.activeBounds,view=nav.raidView;
 const r=expandedCandidate(s,specs,bounds,0,nav);
 assert.equal(r.expandedRings,0);assert.equal(r.attempts.length,1);assert.ok(r.entry);
 assert.equal(nav.activeBounds,bounds);assert.equal(nav.raidView,view);assert.equal(JSON.stringify(s),before);
 assert.ok(r.entry.entries[0].z>20);assert.deepEqual(r.requiredChunks,['0,0','0,1']);
 assert.throws(()=>expandedCandidate(s,specs,bounds,0,nav,3),RangeError);
 assert.ok(expandedCandidate(s,specs,bounds,0,nav,0).entry);
});
test('entry chunk demand includes whole bodies and exits at negative and positive seams',()=>{
 const entry={entries:[{x:-24,z:24}],exits:[{x:-24,z:27}]};
 assert.deepEqual(requiredEntryChunks(entry,specs),['-1,0','-1,1','0,0','0,1']);
});
test('evidence retains the successful native wall impact and bounded failure',()=>{
 const r=JSON.parse(readFileSync(new URL('../docs/qa/retained-raid-entry-audit/expanded-candidate.json',import.meta.url)));
 assert.equal(r.rows.find(r=>r.shape==='clipped-bounds').firstHit,'StructureHit');
 const failed=r.rows.find(r=>r.shape==='oversized-enclosure');assert.equal(failed.entry,null);assert.equal(failed.attempts.length,3);
 const frozen=JSON.parse(readFileSync(new URL('../docs/qa/retained-raid-entry-audit/prototype-source.json',import.meta.url),'utf8'));
 assert.equal(frozen.commit,'6b253ac24f991c6639df1e986e6b8023c22d03c2');
 for(const [p,sha] of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(frozen.files[p]).digest('hex'),sha);
});
