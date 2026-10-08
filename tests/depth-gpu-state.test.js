import test from 'node:test';
import assert from 'node:assert/strict';
import {createDepthGpuProbe} from './browser/depth-gpu-state.js';

function fixture(){
 const program={},shader={},textures=new Map([[101,{}],[103,{}]]),depth={},color={};let target=depth,active=107,fail=false,draws=0,sourceReads=0;
 const gl=new Proxy({TEXTURE0:100,getParameter(key){return key==='CURRENT_PROGRAM'?program:key==='ACTIVE_TEXTURE'?active:key==='MAX_VERTEX_ATTRIBS'?0:key==='TEXTURE_BINDING_2D'?textures.get(active):key==='ELEMENT_ARRAY_BUFFER_BINDING'?null:key==='VIEWPORT'?new Int32Array([0,0,12,12]):key==='COLOR_WRITEMASK'?[false,false,false,false]:true;},getAttachedShaders(){return [shader];},getShaderParameter(){return 'FRAGMENT_SHADER';},getShaderSource(){sourceReads++;return 'void main(){}';},getProgramParameter(){return 1;},getActiveAttrib(){return {name:'position',type:'FLOAT_VEC3',size:1};},getAttribLocation(){return 4;},getActiveUniform(){return {name:'map[0]',type:'SAMPLER_2D',size:2};},getUniformLocation(){return {};},getUniform(){return new Int32Array([1,3]);},activeTexture(unit){active=unit;},getTexParameter(){if(fail)throw Error('query failed');return 9729;},isEnabled(){return false;}},{get(object,key){return key in object?object[key]:key;}});
 const renderer={getContext:()=>gl,getRenderTarget:()=>target,renderBufferDirect(){assert.equal(this,renderer);draws++;return 23;}};
 const object={uuid:'selected'},geometry={uuid:'geometry'},material={id:12,type:'MeshStandardMaterial'};
 return {world:{renderer,destructionPass:{smokeDepth:depth},assetGroups:{colors:new Map([['14:2',{mesh:object}]])}},renderer,object,geometry,material,color,depth,setTarget:v=>target=v,setFail:v=>fail=v,active:()=>active,draws:()=>draws,sourceReads:()=>sourceReads,draw(){return renderer.renderBufferDirect(null,null,geometry,material,object,null);}};
}

test('GPU probe observes selected draws only after submission, with stable IDs and restored sampler unit',()=>{
 const f=fixture(),original=f.renderer.renderBufferDirect,probe=createDepthGpuProbe(f.world,['selected']);
 const rows=probe.capture(()=>{assert.equal(f.draw(),23);f.setTarget(f.color);assert.equal(f.draw(),23);f.setTarget(f.depth);});
 assert.equal(f.draws(),2);assert.equal(rows.length,1);assert.equal(rows[0].assetGroup,'14:2');
 assert.deepEqual(rows[0].uniforms['map[0]'].value,[1,3]);assert.equal(rows[0].textures['map[0]:1'].unit,1);assert.equal(rows[0].textures['map[0]:3'].unit,3);
 assert.notEqual(rows[0].textures['map[0]:1'].id,rows[0].textures['map[0]:3'].id);assert.equal(f.active(),107);assert.equal(f.renderer.renderBufferDirect,original);
 const repeated=probe.capture(()=>f.draw());assert.deepEqual(repeated,rows);assert.equal(probe.programs.length,1);assert.equal(f.sourceReads(),1);
 assert.deepEqual(probe.programs[0].attributes,[{name:'position',type:'FLOAT_VEC3',size:1,location:4}]);
});

test('GPU query failure restores both the sampler unit and renderer hook; render errors propagate',()=>{
 const f=fixture(),original=f.renderer.renderBufferDirect,probe=createDepthGpuProbe(f.world,['selected']);f.setFail(true);
 assert.throws(()=>probe.capture(()=>f.draw()),/query failed/);assert.equal(f.active(),107);assert.equal(f.renderer.renderBufferDirect,original);
 assert.throws(()=>probe.capture(()=>{throw Error('render failed');}),/render failed/);assert.equal(f.renderer.renderBufferDirect,original);
});

test('GPU probe refuses empty or unbounded selections before installing any observer',()=>{
 for(const ids of [[],null,[''],[1],Array.from({length:9},(_,i)=>String(i))])assert.throws(()=>createDepthGpuProbe({},ids),/selection/);
});
