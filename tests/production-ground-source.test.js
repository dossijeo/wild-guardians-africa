import test from 'node:test';
import assert from 'node:assert/strict';
import {groundMaterialFunctions} from '../src/rendering/biome-material-source.js';
import {withoutLegacyGroundRecipe} from '../src/rendering/production-ground-source.js';

test('removing historical ground recipe preserves the entire active recipe and declarations',()=>{
 const result=withoutLegacyGroundRecipe(groundMaterialFunctions,{biome:'mangrove'});
 const current=groundMaterialFunctions.indexOf('vec3 sampleTurfN410(');
 assert.ok(current>0);
 assert.equal(result.slice(result.indexOf('vec3 sampleTurfN410(')),groundMaterialFunctions.slice(current).replace('if((uBiome>4.5?1.:0.)>.5){groundMaterialLegacy419(worldP,Ng,color,N,rough,wet);return;}','if((uBiome>4.5?1.:0.)>.5){return;}'));
 assert.ok(result.startsWith(groundMaterialFunctions.slice(0,groundMaterialFunctions.indexOf('void groundMaterialLegacy419('))));
 assert.ok(!result.includes('groundMaterialLegacy419'));
});
test('historical ground pruning rejects a newly introduced dependency or source drift',()=>{
 assert.throws(()=>withoutLegacyGroundRecipe(groundMaterialFunctions+'\nvoid useOld(){groundMaterialLegacy419();}',{biome:'mangrove'}),/referenced/);
 assert.throws(()=>withoutLegacyGroundRecipe('void another(){}',{biome:'mangrove'}),/missing/);
});

test('desert retains its required legacy branch exactly',()=>{assert.equal(withoutLegacyGroundRecipe(groundMaterialFunctions,{biome:'desert'}),groundMaterialFunctions);});
