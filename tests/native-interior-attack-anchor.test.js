import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeInteriorAttackAnchor} from '../tools/native-interior-attack-anchor.mjs';
import {nativePerimeterServiceCandidate} from '../tools/native-perimeter-service-candidate.mjs';
import {nativePerimeterContactCandidate} from '../tools/native-perimeter-contact-candidate.mjs';
import {agriculturalRayClear} from '../src/simulation/raid-agricultural-impact.js';
import {containsPoint} from '../src/world/footprints.js';
const root=new URL('../docs/qa/integrated-spiritual-survival/',import.meta.url);
function fixture(){
 const report=JSON.parse(readFileSync(new URL('native-paid-canyon-contact-contour-v1.json',root)));
 const s=deserialize(gunzipSync(readFileSync(new URL('native-paid-canyon-contact-contour-v1-state.json.gz',root))).toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 return {s,nav,contour:report.attempts[0]};
}
test('real paid Canyon contour has a contact anchor when crop pivots reject large bodies',()=>{
 const {s,nav,contour}=fixture(),before=serialize(s);
 assert.equal(s.plants.filter(p=>p.alive&&nav.walkable(p.x,p.z,1.1,null,false)).length,0);
 const anchor=nativeInteriorAttackAnchor(s,nav,1.1,contour.points);
 assert(anchor);assert.equal(anchor.kind,'crop-contact');
 const crop=s.plants.find(p=>p.id===anchor.targetId);
 assert(nav.walkable(anchor.x,anchor.z,1.1,null,false));assert(agriculturalRayClear(s,nav,anchor,crop));
 assert(containsPoint(contour.points.map(([x,z])=>({x,z})),anchor.x,anchor.z));
 assert.equal(serialize(s),before);
});
test('contact fallback cannot accept an exterior pose or an unspecified contour',()=>{
 const {s,nav}=fixture(),before=serialize(s);
 assert.equal(nativeInteriorAttackAnchor(s,nav,1.1,null),null);
 assert.equal(nativeInteriorAttackAnchor(s,nav,1.1,[[10000,10000],[10010,10000],[10010,10010],[10000,10010]]),null);
 assert.equal(serialize(s),before);
});
test('contact anchor retains all positive enclosure and worker-service checks after reload',()=>{
 const {s,nav,contour}=fixture(),before=serialize(s),plan={pieces:[],updates:[],suppressed:[]};
 const old=nativePerimeterServiceCandidate(s,nav,plan,contour.bounds,{outline:contour.points});
 assert.equal(old.valid,false);assert.equal(old.reason,'no-clear-interior-crop');
 const proof=nativePerimeterContactCandidate(s,nav,plan,contour.bounds,{outline:contour.points});
 assert(proof.valid);assert.equal(proof.checks.length,5);
 for(const row of proof.checks)assert(row.completeClosedComponent||row.services?.valid);
 assert.equal(proof.workerService.checks.workers.length,1);assert.equal(proof.workerService.checks.crops.length,8);
 assert.equal(serialize(s),before);
});
test('removing the paid perimeter cannot be certified merely because a contact anchor exists',()=>{
 const {s,nav,contour}=fixture();s.structures=s.structures.filter(p=>p.kind!=='wall');nav.setState(s);
 assert(nativeInteriorAttackAnchor(s,nav,1.1,contour.points));
 const before=serialize(s),proof=nativePerimeterContactCandidate(s,nav,{pieces:[],updates:[],suppressed:[]},contour.bounds,{outline:contour.points,cache:false});
 assert.equal(proof.valid,false);assert.equal(proof.reason,'native-animal-route-through-perimeter');
 assert.equal(serialize(s),before);
});
