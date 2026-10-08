import test from 'node:test';import assert from 'node:assert/strict';
import {loadingCopy} from '../src/ui/loading-copy.js';
test('localized loading phase text comes from pending real milestones',()=>{
 for(const [pending,en,es] of [['configuration','Preparing your world...','Preparando tu mundo...'],['chunks','Preparing the terrain...','Preparando el terreno...'],['animals','Awakening nature...','Despertando la naturaleza...'],['gpu','Bringing your world to life...','Dando vida a tu mundo...']]){
  const snapshot={pending:[pending],progress:.4,ready:false};assert.equal(loadingCopy(snapshot).title,en);assert.equal(loadingCopy(snapshot,{locale:'es-ES'}).title,es);
 }
});
test('percentage and bar use exactly the same smoothed native growth progress and readiness gate',()=>{
 const snapshot={pending:['gpu'],progress:.67,ready:false},copy=loadingCopy(snapshot,{progress:.58});assert.equal(copy.value,.58);assert.equal(copy.percent,58);assert.equal(loadingCopy({...snapshot,progress:1},{progress:1}).percent,99);
 const ready=loadingCopy({pending:[],progress:1,ready:true},{progress:1,locale:'es',pointer:'touch'});assert.equal(ready.value,1);assert.equal(ready.percent,100);assert.equal(ready.title,'Todo está listo');assert.equal(ready.help,'Toca la tierra para plantar más maíz');assert.equal(loadingCopy(snapshot,{pointer:'mouse'}).help,'Click the soil to plant more maize');
});
