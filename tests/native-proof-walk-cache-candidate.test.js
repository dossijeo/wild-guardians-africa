import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {installProofWalkCache} from '../tools/native-proof-walk-cache-candidate.mjs';
function fixture(){
 const s=deserialize(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/native-paid-canyon-contact-contour-v1-state.json.gz',import.meta.url))).toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return {s,nav};
}
test('isolated exact walk cache preserves validity, slope peaks, view identity and native epochs',()=>{
 const {s,nav}=fixture(),before=serialize(s),p=s.plants[0],original=nav.testWalkable;
 nav.workerSweep={peak:0};const baseline=original.call(nav,p.x,p.z,.28,null,true),peak=nav.workerSweep.peak;delete nav.workerSweep;
 const memo=installProofWalkCache(nav,{capacity:2});
 nav.workerSweep={peak:0};assert.equal(nav.testWalkable(p.x,p.z,.28,null,true),baseline);assert.equal(nav.workerSweep.peak,peak);
 nav.workerSweep={peak:0};assert.equal(nav.testWalkable(p.x,p.z,.28,null,true),baseline);assert.equal(nav.workerSweep.peak,peak);delete nav.workerSweep;
 assert.equal(memo.stats().hits,1);
 const view=nav.forBuildingPlacement({id:'cover-crop',kind:'house',x:p.x,z:p.z,radius:5});
 assert.equal(view.testWalkable(p.x,p.z,.28,null,true),false);assert.equal(view.testWalkable(p.x,p.z,.28,null,true),false);
 assert.equal(memo.stats().contexts,2);assert.equal(memo.stats().hits,2);
 assert.equal(serialize(s),before);
 nav.setState(s);const afterEpoch=serialize(s);assert.equal(nav.testWalkable(p.x,p.z,.28,null,true),baseline);assert.equal(memo.stats().invalidations,1);
 nav.testWalkable(p.x+1,p.z,.28,null,true);nav.testWalkable(p.x+2,p.z,.28,null,true);assert(memo.stats().entries<=2);assert(memo.stats().evictions>0);
 memo.restore();assert.equal(nav.testWalkable,original);assert.equal(Object.hasOwn(nav,'testWalkable'),false);assert.equal(serialize(s),afterEpoch);
});
test('proof walk memo rejects invalid capacity and custom methods',()=>{
 const {nav}=fixture();assert.throws(()=>installProofWalkCache(nav,{capacity:0}));
 nav.testWalkable=()=>true;assert.throws(()=>installProofWalkCache(nav));
});
