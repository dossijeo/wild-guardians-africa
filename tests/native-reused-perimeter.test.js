import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativePerimeterContactCandidate} from '../tools/native-perimeter-contact-candidate.mjs';
import {nativePerimeterReusedCandidate} from '../tools/native-perimeter-reused-candidate.mjs';
import {nativeReusedServiceComponentProof} from '../tools/native-reused-service-component-proof.mjs';
const root=new URL('../docs/qa/integrated-spiritual-survival/',import.meta.url),plan={pieces:[],updates:[],suppressed:[]};
function fixture(){
 const s=deserialize(gunzipSync(readFileSync(new URL('native-paid-canyon-contact-contour-v1-state.json.gz',root))).toString());
 const contour=JSON.parse(readFileSync(new URL('native-paid-canyon-contact-contour-v1.json',root))).attempts[0];
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return {s,nav,contour};
}
function normalized(proof){const copy=structuredClone(proof);for(const row of copy.checks??[])if(row.services)delete row.services.reusedComponents;return copy;}
test('reused positive components preserve paid Canyon certificate and complete worker service',()=>{
 const a=fixture(),b=fixture(),before=serialize(b.s);
 const original=nativePerimeterContactCandidate(a.s,a.nav,plan,a.contour.bounds,{outline:a.contour.points,cache:false});
 const reused=nativePerimeterReusedCandidate(b.s,b.nav,plan,b.contour.bounds,{outline:b.contour.points,cache:false});
 assert(original.valid);assert(reused.valid);assert.deepEqual(normalized(reused),original);
 assert(reused.checks.some(r=>r.services?.reusedComponents>0));assert.equal(serialize(b.s),before);
});
test('reused-component candidate rejects a physically open paid-wall control',()=>{
 const {s,nav,contour}=fixture();s.structures=s.structures.filter(p=>p.kind!=='wall');nav.setState(s);
 const before=serialize(s),proof=nativePerimeterReusedCandidate(s,nav,plan,contour.bounds,{outline:contour.points,cache:false});
 assert.equal(proof.valid,false);assert.equal(proof.reason,'native-animal-route-through-perimeter');assert.equal(serialize(s),before);
});
test('failed routes without positive component certificates remain unproven',()=>{
 const view={closedRegions:new Map(),walkable:()=>true,segmentClear:(_a,b)=>b.x!==20,approachPath:()=>null};
 const proof=nativeReusedServiceComponentProof({},view,[{id:'crop',x:0,z:0}],1,{x:20,z:0},[[-5,-5],[5,-5],[5,5],[-5,5]]);
 assert.equal(proof.valid,false);assert.equal(proof.reason,'native-service-component-unproven');
});
