import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeVisibleResidentOwners} from './browser/native-idle-stroll-restoration-world-owner.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-initial-idle-outside-watch-ready-owners.json',import.meta.url))),all=owners=>owners.actors.flatMap(actor=>actor.meshes);

test('actual WATCH21→22 capture differs only in4 fully hidden material IDs and keeps every submitted owner',()=>{
 const {readyOwners,afterOwners}=fixture;assert.notDeepEqual(readyOwners,afterOwners);const before=structuredClone(readyOwners),after=structuredClone(afterOwners),changed=all(readyOwners).filter((m,i)=>JSON.stringify(m)!==JSON.stringify(all(afterOwners)[i]));assert.equal(changed.length,4);assert(changed.every(m=>m.visible===false&&m.effectiveVisible===false));assert.deepEqual(nativeVisibleResidentOwners(readyOwners),nativeVisibleResidentOwners(afterOwners));assert.deepEqual(readyOwners,before);assert.deepEqual(afterOwners,after);
});

for(const change of ['visible-material','hidden-geometry','hidden-id','visible-flag','effective-visibility','remove-hidden','root','bone','instances','unknown-field'])test(`visible owner guard still rejects ${change}`,()=>{
 const baseline=fixture.afterOwners,value=structuredClone(baseline),hidden=all(value).find(m=>m.effectiveVisible===false),visible=all(value).find(m=>m.effectiveVisible===true);assert(hidden&&visible);
 if(change==='visible-material')visible.material=[999999];else if(change==='hidden-geometry')hidden.geometry++;else if(change==='hidden-id')hidden.id++;else if(change==='visible-flag')hidden.visible=!hidden.visible;else if(change==='effective-visibility')hidden.effectiveVisible=true;else if(change==='remove-hidden'){const actor=value.actors.find(a=>a.meshes.includes(hidden));actor.meshes.splice(actor.meshes.indexOf(hidden),1);}else if(change==='root')value.actors[0].root++;else if(change==='bone')value.actors[0].bones[0]++;else if(change==='instances')value.instances.push({id:999999});else hidden.unexpected=true;
 assert.notDeepEqual(nativeVisibleResidentOwners(value),nativeVisibleResidentOwners(baseline));
});
