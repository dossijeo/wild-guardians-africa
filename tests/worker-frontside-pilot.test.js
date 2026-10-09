import test from 'node:test';
import assert from 'node:assert/strict';
import {installWorkerFrontsidePilot,workerFrontsideNames} from '../tools/lib/worker-frontside-pilot.mjs';
function fixture(){let disposed=0;const source={side:2,shadowSide:null,defines:{EXISTING:1},onBeforeCompile(){},customProgramCacheKey(){return 'source';},clone(){return {...this,dispose(){disposed++;}};}};
 const geometry={attributes:{position:{},skinWeight:{}},dispose(){throw Error('Borrowed geometry disposed');}};
 const body={name:'Mesh0',isMesh:true,isSkinnedMesh:true,geometry,material:{side:0}};
 const meshes=[body,...workerFrontsideNames.map(name=>({name,isMesh:true,geometry,material:source}))];return {root:{traverse(fn){meshes.forEach(fn);}},meshes,source,geometry,body,get disposed(){return disposed;}};}
test('pilot preserves borrowed identity and body, restores on repeated toggles/release',()=>{
 const f=fixture(),bodyMaterial=f.body.material,attributes=f.geometry.attributes,p=installWorkerFrontsidePilot(f.root);
 assert.equal(p.owned.size,1);assert.equal(f.body.material,bodyMaterial);assert.equal(f.body.material.side,0);
 for(const e of p.entries){assert.equal(e.candidate.side,0);assert.equal(e.candidate.shadowSide,2);assert.ok(Object.hasOwn(e.candidate.defines,'DOUBLE_SIDED'));assert.equal(e.candidate.defines.EXISTING,1);}
 for(let i=0;i<2;i++){p.setEnabled(false);assert.ok(p.entries.every(e=>e.mesh.material===f.source));p.setEnabled(true);}
 p.release();p.release();assert.equal(f.disposed,1);assert.equal(f.source.side,2);assert.equal(f.geometry.attributes,attributes);assert.ok(p.entries.every(e=>e.mesh.geometry===f.geometry&&e.mesh.material===f.source));assert.throws(()=>p.setEnabled(true),/Released/);
 const again=installWorkerFrontsidePilot(f.root,{shadowFront:true});assert.ok(again.entries.every(e=>e.candidate.shadowSide===0));again.release();assert.equal(f.disposed,2);
});
test('invalid source is rejected before allocating or changing materials',()=>{const f=fixture();f.meshes.pop();assert.throws(()=>installWorkerFrontsidePilot(f.root),/Incomplete/);assert.equal(f.disposed,0);assert.ok(f.meshes.slice(1).every(m=>m.material===f.source));const g=fixture();g.meshes[3].isSkinnedMesh=true;assert.throws(()=>installWorkerFrontsidePilot(g.root),/Unexpected/);assert.equal(g.disposed,0);assert.ok(g.meshes.slice(1).every(m=>m.material===g.source));});
