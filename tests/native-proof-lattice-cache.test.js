import test from 'node:test';import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';import {serialize} from '../src/persistence/snapshots.js';
import {TerrainField} from '../src/world/terrain.js';import {withNativeProofLatticeCache} from '../tools/native-proof-lattice-cache.mjs';
test('native surface/slope/fluid results and state remain exact with numeric lattice memo',()=>{
 const {s,nav}=createOpeningWorld({seed:123}),before=serialize(s),original=nav.field,points=Array.from({length:40},(_,i)=>[88+(i%8)*.13,1+Math.floor(i/8)*.17]);
 const evaluate=v=>points.map(([x,z])=>[v.field.surface(x,z),v.field.slope(x,z),v.field.fluidInside(x,z)]),reference=evaluate(nav);let stats,escaped;
 const result=withNativeProofLatticeCache(nav,v=>{escaped=v;return evaluate(v);},{mode:'cache',onDiagnostics:r=>stats=r});assert.deepEqual(result,reference);assert.equal(serialize(s),before);assert.equal(nav.field,original);assert.ok(stats.hits>0);assert.equal(stats.latticeCalls,stats.hits+stats.nativeLatticeCalls);assert.equal(escaped.field.surface(88,1),original.surface(88,1));
});
test('OFF keeps original object; diagnostics computes all native lattice queries; bounded capacity does not evict or fabricate',()=>{
 const {nav}=createOpeningWorld({seed:123});withNativeProofLatticeCache(nav,v=>assert.equal(v,nav));let diagnostic,cached;
 const evaluate=v=>Array.from({length:30},(_,i)=>v.field.surface(88+i*.2,1+i*.1));
 const a=withNativeProofLatticeCache(nav,evaluate,{mode:'diagnose',onDiagnostics:r=>diagnostic=r}),b=withNativeProofLatticeCache(nav,evaluate,{mode:'cache',limit:4,onDiagnostics:r=>cached=r});assert.deepEqual(a,b);assert.equal(diagnostic.hits,0);assert.equal(diagnostic.nativeLatticeCalls,diagnostic.latticeCalls);assert.equal(cached.entries,4);assert.ok(cached.capacityBypasses>0);
});
test('epoch clears lease cache and modified deep inputs/prototypes reject entire result',()=>{
 const {nav}=createOpeningWorld({seed:123});let stats;
 withNativeProofLatticeCache(nav,v=>{v.field.surface(88,1);nav.version++;v.field.surface(88,1);},{mode:'cache',onDiagnostics:r=>stats=r});assert.equal(stats.epochInvalidations,1);
 const relief=nav.field.c.relief;try{assert.throws(()=>withNativeProofLatticeCache(nav,v=>{v.field.surface(88,1);nav.field.c.relief=relief+1;return v.field.surface(88,1);},{mode:'cache'}),/physical inputs changed/);}finally{nav.field.c.relief=relief;}
 const source=TerrainField.prototype.height;try{assert.throws(()=>withNativeProofLatticeCache(nav,v=>{v.field.surface(88,1);TerrainField.prototype.height=()=>10;return v.field.surface(88,1);},{mode:'cache'}),/physical inputs changed/);}finally{TerrainField.prototype.height=source;}
});
test('unknown adapters bypass, thrown computation cleans up escaped wrapper',()=>{
 const adapter={field:{surface:()=>42}},result=withNativeProofLatticeCache(adapter,v=>v.field.surface(),{mode:'cache'});assert.equal(result,42);
 const {nav}=createOpeningWorld({seed:123});let escaped;assert.throws(()=>withNativeProofLatticeCache(nav,v=>{escaped=v;v.field.surface(88,1);throw Error('fixture failure');},{mode:'cache'}),/fixture failure/);assert.equal(escaped.field.surface(88,1),nav.field.surface(88,1));
});
test('all six native biome surfaces/slopes/fluids keep exact numbers and serialized state',()=>{
 for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
  const {s,nav}=createOpeningWorld({seed:123,biome}),before=serialize(s),p=s.structures[0],points=Array.from({length:30},(_,i)=>[p.x+(i%6-3)*.31,p.z+(Math.floor(i/6)-2)*.27]);
  const evaluate=v=>points.map(([x,z])=>[v.field.surface(x,z),v.field.slope(x,z),v.field.fluidInside(x,z)]);
  assert.deepEqual(withNativeProofLatticeCache(nav,evaluate,{mode:'cache'}),evaluate(nav),biome);assert.equal(serialize(s),before,biome);
 }
});
