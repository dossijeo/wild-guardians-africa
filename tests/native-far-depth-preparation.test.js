import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group} from 'three';
import {prepareNativeFarDepth} from '../tools/experiments/prepare-native-far-depth.js';
test('far depth restores parent before readiness and propagates stale completion',async()=>{
 const parent=new Group(),root=new Group();parent.add(root);let finish,stale=false;
 const w={scene:new Scene(),camera:{},destructionPass:{prepareDepth(camera,scene){assert.equal(root.parent,scene);return new Promise(resolve=>finish=resolve);}}};
 const p=prepareNativeFarDepth(w,root,()=>stale);assert.equal(root.parent,parent);stale=true;finish();await assert.rejects(p,{name:'AbortError'});assert.equal(root.parent,parent);
});
test('far depth restores original ownership on synchronous submission failure',async()=>{
 const parent=new Group(),root=new Group();parent.add(root);const w={scene:new Scene(),destructionPass:{prepareDepth(){throw Error('submission failed');}}};
 await assert.rejects(prepareNativeFarDepth(w,root),/submission failed/);assert.equal(root.parent,parent);
});
