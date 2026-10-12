import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativePerimeterContactCandidate} from '../tools/native-perimeter-contact-candidate.mjs';import {withNativeProofLatticeCache} from '../tools/native-proof-lattice-cache.mjs';
test('flat lease preserves full positive paid Canyon gate/service certificate and open negative',()=>{
 const root='docs/qa/integrated-spiritual-survival/',original=gunzipSync(readFileSync(root+'native-paid-canyon-contact-contour-v1-state.json.gz')).toString(),s=deserialize(original),contour=JSON.parse(readFileSync(root+'native-paid-canyon-contact-contour-v1.json')).attempts[0],profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json')).profile,plan={pieces:[],updates:[],suppressed:[]};
 const run=(cache,open)=>{const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);if(open)nav.obstacles=nav.obstacles.filter(o=>o.kind!=='wall');return withNativeProofLatticeCache(nav,v=>nativePerimeterContactCandidate(s,v,plan,contour.bounds,{outline:contour.points}),{mode:cache?'cache':'off',storage:'flat'});};
 const native=run(false,false),cached=run(true,false);assert.equal(native.valid,true);assert.deepEqual(cached,native);const open=run(false,true);assert.equal(open.valid,false);assert.deepEqual(run(true,true),open);assert.equal(serialize(s),original);
});
