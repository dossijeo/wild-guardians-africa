import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,PointLight} from 'three';
import {withRenderOrigin} from '../src/rendering/render-origin.js';
import {installOriginMatrixProbe} from '../tools/experiments/qa-origin-matrix-probe.js';
test('probe preserves synchronization, sees light mutation, and restores wrappers after exceptions',()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),light=new PointLight();scene.add(light);
 let fail=false,seen=[];
 const world={scene,renderOrigin:{x:192,z:0},vfxLibrary:{worldLights:[light]},renderer:{render(s){s.updateMatrixWorld();seen.push(light.matrixWorld.elements[12]);if(fail)throw Error('draw');}}};
 world.drawWorldFrame=()=>withRenderOrigin({scene,camera,origin:world.renderOrigin},()=>{light.position.x+=1;world.renderer.render(scene,camera);});
 const update=scene.updateMatrixWorld,render=world.renderer.render,draw=world.drawWorldFrame;
 let t=0;const finish=installOriginMatrixProbe(world,()=>++t);
 world.drawWorldFrame();fail=true;assert.throws(()=>world.drawWorldFrame(),/draw/);
 const stats=finish();assert.deepEqual(seen,[-191,-190]);assert.equal(light.matrixWorld.elements[12],2);
 assert.equal(stats.nonzeroOriginDraws,2);assert.equal(stats.afterExplicitUpdate,2);assert.equal(stats.staleLightPositions,2);
 assert.deepEqual(stats.rootCalls,{outside:0,preDraw:2,renderer:2,postDraw:2});
 assert.equal(scene.updateMatrixWorld,update);assert.equal(world.renderer.render,render);assert.equal(world.drawWorldFrame,draw);
});
test('zero origin has no explicit pre-render update',()=>{
 const scene=new Scene(),camera=new PerspectiveCamera();
 const world={scene,renderOrigin:{x:0,z:0},renderer:{render(s){s.updateMatrixWorld();}}};
 world.drawWorldFrame=()=>withRenderOrigin({scene,camera,origin:world.renderOrigin},()=>world.renderer.render(scene,camera));
 const finish=installOriginMatrixProbe(world);world.drawWorldFrame();const stats=finish();
 assert.equal(stats.nonzeroOriginDraws,0);assert.equal(stats.afterExplicitUpdate,0);assert.equal(stats.rootCalls.renderer,1);
});
