import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTerrainChunk,discardPreparedTerrain} from '../src/rendering/prepare-terrain-chunk.js';
function fixture(){
 const state={closed:0,disposed:0,steps:0},group={};
 const world={quality:'media',*prepareTerrainSteps(){let done=false;try{for(let i=0;i<3;i++){state.steps++;yield i;}done=true;return group;}finally{if(!done)state.closed++;}},disposePreparedTerrain(g){assert.equal(g,group);state.disposed++;}};
 return {world,state,group};
}
test('staged preparation yields but only transfers a complete group',async()=>{
 const f=fixture();let yields=0;
 const data=await prepareTerrainChunk(f.world,{cx:2,cz:3},()=>true,{budgetMs:0,yieldWork:async()=>{yields++;assert.equal(f.state.closed,0);}});
 assert.equal(yields,3);assert.equal(data.preparedGroup,f.group);assert.equal(f.state.closed,0);
 discardPreparedTerrain(f.world,data);discardPreparedTerrain(f.world,data);assert.equal(f.state.disposed,1);
});
for(const cause of ['obsolete','quality','teardown'])test(`staged ${cause} closes private work before another step`,async()=>{
 const f=fixture();let current=true;
 const data=await prepareTerrainChunk(f.world,{cx:0,cz:0},()=>current,{budgetMs:0,yieldWork:async()=>{if(cause==='obsolete')current=false;if(cause==='quality')f.world.quality='baja';if(cause==='teardown')f.world.disposed=true;}});
 assert.equal(data,null);assert.equal(f.state.closed,1);assert.equal(f.state.steps,1);
});
test('scheduler failure closes the pending iterator',async()=>{
 const f=fixture();await assert.rejects(prepareTerrainChunk(f.world,{cx:0,cz:0},()=>true,{budgetMs:0,yieldWork:async()=>{throw Error('failure');}}),/failure/);assert.equal(f.state.closed,1);
});
