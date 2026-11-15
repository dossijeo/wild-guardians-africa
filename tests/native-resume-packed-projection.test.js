import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,MeshBasicMaterial} from 'three';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {prepareNativeResumeGpuTable} from '../src/rendering/native-route-gpu-table.js';

test('native resume projection compatibility preserves the packed terrain and phases under continuous advancement',()=>{
 const f=nativeGateCrossingFixture(),material=new MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene:new Scene(),material}),terrain=createConfirmedTerrainSupport({residency}),chunks=[];
 try{
  for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++){f.session.core.selectChunk(cx,cz);residency.replace(f.session.core.chunkPayload(),1,'terrain');chunks.push({cx,cz,revision:1});}
  const manifest={epoch:'terrain',chunks},a=f.admit(f.route({facts:{urgent:true,runRemaining:6}}));assert.equal(a.status,'admitted');f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();f.advance(10.3);const held=f.bridge.suspendNativeGateRoute(a.routeHandle);f.advance(20);f.bridge.commitNativeCausalClock();let p=f.bridge.prepareNativeGateResumeProposal(held.suspendedRoute.resumeHandle).proposal;
  let checked=0;
  for(let i=1;i<=100;i++){
   const before=prepareNativeResumeGpuTable(terrain.prepareNativeResumeProposal(p,{terrainManifest:manifest}));
   f.advance(20+i*.02);f.bridge.commitNativeCausalClock();const r=f.bridge.revalidateNativeGateResumeProposal(p.ticket);assert.equal(r.status,'revalidated');
   const after=prepareNativeResumeGpuTable(terrain.prepareNativeResumeProposal(r.proposal,{terrainManifest:manifest}));
   if(r.timeTranslation.sameFloat32Motion&&r.timeTranslation.sameFloat32Gates){checked++;const differences=Array.from(before.data.keys()).filter(j=>!Object.is(before.data[j],after.data[j]));assert.deepEqual(differences,[],JSON.stringify({at:r.proposal.startTime,differences:differences.slice(0,8).map(j=>({index:j,field:j%20,before:before.data[j],after:after.data[j]}))}));}
   p=r.proposal;
  }
  assert.equal(checked,100);
 }finally{terrain.dispose();residency.dispose();material.dispose();f.session.dispose();}
});
