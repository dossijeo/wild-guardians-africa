import fs from 'node:fs';import{execFileSync}from'node:child_process';import assert from'node:assert/strict';import{captureNativeRoutePickFrame}from'../src/rendering/native-route-pick-frame.js';
const source=execFileSync('git',['show','7f350bb37:src/rendering/webgpu-world-surface.js'],{encoding:'utf8'}),start=source.indexOf('  async function freezeNativePickTime(){'),end=source.indexOf('  function remoteClockLease',start);assert(start>0&&end>start);
let finish,route={actorId:7,assignmentSequence:3,routeHandle:{authorityEpoch:'owner',session:1,slot:0,generation:2}};const before=structuredClone(route),remoteGpu={inspectAsync:()=>new Promise(resolve=>{finish=resolve;})};
const api=Function('captureNativeRoutePickFrame','remoteGpu','currentRoute',`let nativePickFrame=null,closed=false;const nativeResourceLease=()=>true;${source.slice(start,end)}return{freezeNativePickTime,pick:()=>nativePickFrame.getTime(currentRoute(),10)};`)(captureNativeRoutePickFrame,remoteGpu,()=>route);
const frozen=api.freezeNativePickTime();route={...route,assignmentSequence:4,routeHandle:{...route.routeHandle,generation:3}};finish({consumer:{failed:false,nativeRouteFrame:{sequence:1,clockElapsed:11,bindings:[{nativeRoute:before,semantic:'relative',epoch:10,elapsed:10.25}]}}});await frozen;
// This assertion intentionally fails against the original production function:
// adoption during the actual inspection await must never mix its owners.
assert.doesNotThrow(()=>api.pick(),'capture plus picking must use a coherent submitted owner after concurrent adoption');
