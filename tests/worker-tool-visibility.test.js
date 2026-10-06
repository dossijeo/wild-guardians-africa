import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,AnimationMixer} from 'three';
import {syncWorkerToolVisibility} from '../src/rendering/worker-tool-visibility.js';
test('Authored hidden tool scales suppress traversal, then native transition scales restore it',()=>{
 const root=new Group(),tool=new Group();tool.name='Prop_Hoe';root.add(tool);const data={model:root};
 tool.scale.setScalar(Math.fround(1e-5));syncWorkerToolVisibility(data);assert.equal(tool.visible,false);
 tool.scale.setScalar(.001);syncWorkerToolVisibility(data);assert.equal(tool.visible,true);
 tool.scale.setScalar(1);syncWorkerToolVisibility(data);assert.equal(tool.visible,true);
 tool.scale.setScalar(1e-5);syncWorkerToolVisibility(data,false);assert.equal(tool.visible,true);
 syncWorkerToolVisibility(data);assert.equal(tool.visible,false);
});
test('Visibility preserves authored hides, ignores body nodes and resets when the rig root changes',()=>{
 const root=new Group(),tool=new Group(),body=new Group();tool.name='Prop_FruitCrate';tool.visible=false;body.name='Body';body.scale.setScalar(0);root.add(tool,body);
 const data={mixer:new AnimationMixer(root)};syncWorkerToolVisibility(data);assert.equal(tool.visible,false);assert.equal(body.visible,true);
 const second=new Group(),secondTool=new Group();secondTool.name='Prop_FruitCrate';second.add(secondTool);data.model=second;syncWorkerToolVisibility(data);assert.equal(secondTool.visible,true);
});
