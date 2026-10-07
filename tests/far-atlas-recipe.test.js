import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateFarAtlasRecipe} from '../tools/experiments/far-atlas-recipe.js';
const manifest=JSON.parse(await fs.readFile('public/content/far-vegetation.json','utf8'));
const pair=reference=>['day','night'].map(bakedPhase=>({...structuredClone(reference),bakedPhase,errors:[],webglError:0}));
test('admission preserves all 22 reviewed atlas recipes and phase framing',()=>{
 for(const species of Object.values(manifest.biomes))for(const reference of species){const [day,night]=pair(reference);assert.doesNotThrow(()=>validateFarAtlasRecipe(day,night,reference,manifest.sunPosition));}
});
test('obsolete sun, changed frame, wrong phase and missing linear-alpha declaration are rejected',()=>{
 const reference=manifest.biomes.savanna.find(t=>t.slot===2);
 for(const change of [d=>{d.sunPosition=[-30,55,25];},d=>{d.nativeSunDirection=false;},d=>{d.baseV+=.01;},d=>{d.bakedPhase='night';},d=>{delete d.prelitAlphaEncoding;}]){
  const [day,night]=pair(reference);change(day);assert.throws(()=>validateFarAtlasRecipe(day,night,reference,manifest.sunPosition));
 }
});
