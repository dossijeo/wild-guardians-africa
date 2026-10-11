import test from 'node:test';
import assert from 'node:assert/strict';
import {installProofSurfaceMemo} from '../tools/native-proof-surface-memo.mjs';
const fixture=()=>{let calls=0;const base={version:1,field:{surface:(x,z)=>x+z,riverLevel:0,canyon:true},workerSurface(x,z){calls++;return this.field.surface(x,z);}};return {base,view:Object.create(base),calls:()=>calls};};
test('exact borrowed view reuse is bounded and isolated from real navigator',()=>{
 const {base,view,calls}=fixture(),memo=installProofSurfaceMemo(view,{capacity:2});
 assert.equal(view.workerSurface(.8,1),1.8);assert.equal(view.workerSurface(.8,1),1.8);assert.equal(calls(),1);
 base.workerSurface(.8,1);assert.equal(calls(),2);view.workerSurface(2,3);view.workerSurface(4,5);view.workerSurface(.8,1);
 assert.equal(memo.stats.peakEntries,2);assert.equal(memo.stats.evictions,2);assert.equal(memo.stats.hits,1);
 memo.restore();assert.equal(Object.hasOwn(view,'workerSurface'),false);assert.equal(view.workerSurface,base.workerSurface);memo.restore();
});
test('negative zero and exact fractional coordinates remain distinct; terrain epochs invalidate',()=>{
 const {view}=fixture();view.field={surface:x=>Object.is(x,-0)?-0:x,riverLevel:0,canyon:true};
 const memo=installProofSurfaceMemo(view);
 assert(Object.is(view.workerSurface(-0,0),-0));assert(Object.is(view.workerSurface(0,0),0));
 assert.equal(view.workerSurface(.8,0),.8);assert.equal(view.workerSurface(.8000000000000002,0),.8000000000000002);
 view.version=2;view.workerSurface(0,0);view.field.surface=()=>7;assert.equal(view.workerSurface(0,0),7);
 view.field.riverLevel=8;view.workerSurface(0,0);view.field={...view.field};view.workerSurface(0,0);
 assert.equal(memo.stats.invalidations,4);memo.restore();
});
test('exceptions do not cache results and original own descriptors restore in finally',()=>{
 const {view}=fixture();let fail=true;const original=()=>{if(fail)throw Error('native failure');return 9;};
 Object.defineProperty(view,'workerSurface',{value:original,configurable:true,writable:true,enumerable:false});const descriptor=Object.getOwnPropertyDescriptor(view,'workerSurface');
 const memo=installProofSurfaceMemo(view);
 try{assert.throws(()=>view.workerSurface(1,1),/native failure/);fail=false;assert.equal(view.workerSurface(1,1),9);}finally{memo.restore();}
 assert.deepEqual(Object.getOwnPropertyDescriptor(view,'workerSurface'),descriptor);
 assert.throws(()=>installProofSurfaceMemo(view,{capacity:0}),RangeError);
});
