import test from 'node:test';import assert from 'node:assert/strict';
import {qaFlatLatticeKey} from '../tools/qa-flat-lattice-key.mjs';
import {withNativeProofLatticeCache} from '../tools/native-proof-lattice-cache.mjs';import {createOpeningWorld} from '../tools/check_opening.mjs';import {serialize} from '../src/persistence/snapshots.js';
test('flat key is bijective across boundaries and signs, all unsupported inputs bypass',()=>{
 const keys=new Set();for(const x of [-8192,-8191,-1,1,8190,8191])for(const z of [-8192,-8191,-1,1,8190,8191]){const k=qaFlatLatticeKey(x,z);assert.ok(Number.isSafeInteger(k));assert.ok(k>=0&&k<268435456);assert.equal(keys.has(k),false);keys.add(k);}
 for(const [x,z]of [[0,1],[-0,1],[1,0],[1,-0],[-8193,1],[8192,1],[1,8192],[1,-8193],[1.5,2],[2,1.5],[NaN,1],[1,Infinity]])assert.equal(qaFlatLatticeKey(x,z),null);
});
test('flat storage keeps native heights/surfaces/state exact, capacity and coordinate fallback honest',()=>{
 const {s,nav}=createOpeningWorld({seed:123}),before=serialize(s),points=[[88,1],[88,1],[0,1],[1,-0],[.5,1],[8192,1],[88,2],[88,3]],expected=points.map(p=>nav.field.lattice(...p));let stats;
 const actual=withNativeProofLatticeCache(nav,v=>points.map(p=>v.field.lattice(...p)),{mode:'cache',storage:'flat',limit:2,onDiagnostics:r=>stats=r});assert.deepEqual(actual,expected);assert.equal(stats.entries,2);assert.ok(stats.hits>0);assert.equal(stats.coordinateBypasses,4);assert.equal(stats.capacityBypasses,1);assert.equal(serialize(s),before);
 for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){const f=createOpeningWorld({seed:123,biome}),p=f.s.structures[0],evaluate=v=>Array.from({length:20},(_,i)=>v.field.surface(p.x+i*.13,p.z+i*.07));assert.deepEqual(withNativeProofLatticeCache(f.nav,evaluate,{mode:'cache',storage:'flat'}),evaluate(f.nav),biome);}
});
