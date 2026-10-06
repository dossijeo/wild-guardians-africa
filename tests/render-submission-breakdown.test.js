import test from 'node:test';
import assert from 'node:assert/strict';
import {captureRenderSubmissions} from './browser/render-submission-breakdown.js';
function fixture(draw){
 const renderer={renderBufferDirect:draw,getRenderTarget:()=>null,info:{autoReset:true,render:{calls:0,triangles:0},reset(){this.render.calls=this.render.triangles=0;}}};
 return {renderer,fluidMaterial:{},state:{workers:[{id:'worker'}],plants:[],crates:[],villages:[],spells:[],structures:[]},sun:{shadow:{map:{}}},destructionPass:{buildings:new Set(),smokeDepth:{},target:{}},sky:{scene:{}}};
}
test('Submission observer reports actual counter deltas and preserves renderer receiver and return',()=>{
 const original=function(){assert.equal(this,world.renderer);this.info.render.calls+=2;this.info.render.triangles+=42;return 'submitted';};
 const world=fixture(original),mesh={uuid:'mesh',userData:{},type:'Mesh',name:'actual',parent:{userData:{entityId:'worker'}}};
 const result=captureRenderSubmissions(world,()=>assert.equal(world.renderer.renderBufferDirect(null,null,null,{type:'Material',side:0},mesh,null),'submitted'));
 assert.deepEqual(result.totals,{calls:2,triangles:42});assert.equal(result.rows[0].category,'worker');assert.equal(result.rows[0].pass,'screen');
 assert.equal(world.renderer.renderBufferDirect,original);assert.equal(world.renderer.info.autoReset,true);
});
test('Submission observer restores renderer hooks when rendering or reconciliation fails',()=>{
 for(const mismatch of [false,true]){
  const original=()=>{throw Error('draw failed');},world=fixture(original);
  assert.throws(()=>captureRenderSubmissions(world,()=>{if(mismatch)world.renderer.info.render.calls++;else throw Error('render failed');}),mismatch?/reconcile/:/render failed/);
  assert.equal(world.renderer.renderBufferDirect,original);assert.equal(world.renderer.info.autoReset,true);
 }
});
