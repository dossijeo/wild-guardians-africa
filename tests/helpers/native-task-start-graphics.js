import assert from 'node:assert/strict';
import {Scene,MeshBasicMaterial,DoubleSide} from 'three';
import {nativeTaskRequestFixture} from './native-task-resource-requests.js';
import {createWebGpuTerrainResidency} from '../../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../../src/rendering/confirmed-terrain-support.js';

export function nativeTaskStartGraphicsFixture(policy={}){
 const f=nativeTaskRequestFixture({bindBodies:true});f.claim();
 const scene=new Scene(),material=new MeshBasicMaterial({side:DoubleSide}),residency=createWebGpuTerrainResidency({scene,material}),chunks=[];
 for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++){f.session.core.selectChunk(cx,cz);residency.replace(f.session.core.chunkPayload(),1,'terrain');chunks.push({cx,cz,revision:1});}
 const terrain=createConfirmedTerrainSupport({residency}),terrainManifest={epoch:'terrain',chunks};
 const result=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.state.tasks[0].workerId),{bodyId:1,radius:.28,urgent:true,runRemaining:4,...policy});assert.equal(result.status,'proposed');
 return {...f,scene,residency,terrain,terrainManifest,proposal:result.proposal,support(value=result.proposal){return terrain.prepareNativeTaskStartProposal(value,{terrainManifest});},commit(prepared=result.proposal){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple.slice(0,5),prepared.ticket.ticket),1);for(const event of f.planner.intentChanges())f.control.accept(event);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.control.acceptClock({...f.planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:10});return f.planner.captureNativeRoutePresentation(prepared.expectedRouteHandle);},close(){terrain.dispose();residency.dispose();material.dispose();f.close();}};
}
