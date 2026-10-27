import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,MeshBasicMaterial} from 'three';
import {prepareNativeFarDepth} from '../tools/experiments/prepare-native-far-depth.js';
test('far depth restores parent before readiness and propagates stale completion',async()=>{
 const parent=new Group(),root=new Group();parent.add(root);root.add(new Mesh(undefined,new MeshBasicMaterial()));let finish,stale=false;
 const w={scene:new Scene(),camera:{},destructionPass:{prepareDepth(camera,scene){assert.equal(root.parent,scene);return new Promise(resolve=>finish=resolve);}}};
 const p=prepareNativeFarDepth(w,root,()=>stale);assert.equal(root.parent,parent);stale=true;finish();await assert.rejects(p,{name:'AbortError'});assert.equal(root.parent,parent);
});
test('far depth restores original ownership on synchronous submission failure',async()=>{
 const parent=new Group(),root=new Group();parent.add(root);root.add(new Mesh(undefined,new MeshBasicMaterial()));const w={scene:new Scene(),destructionPass:{prepareDepth(){throw Error('submission failed');}}};
 await assert.rejects(prepareNativeFarDepth(w,root),/submission failed/);assert.equal(root.parent,parent);
});

test('fully excluded roots skip depth preparation but opaque descendants still participate',async()=>{
 const root=new Group(),mesh=new Mesh(undefined,new MeshBasicMaterial({transparent:true,depthWrite:false}));root.add(mesh);let calls=0;const w={scene:new Scene(),destructionPass:{prepareDepth(){calls++;return Promise.resolve();}}};
 await prepareNativeFarDepth(w,root);assert.equal(calls,0);
 mesh.add(new Mesh(undefined,new MeshBasicMaterial()));await prepareNativeFarDepth(w,root);assert.equal(calls,1);
 root.visible=false;await prepareNativeFarDepth(w,root);assert.equal(calls,1);
});
