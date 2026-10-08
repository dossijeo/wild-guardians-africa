import test from 'node:test';
import assert from 'node:assert/strict';
import {sourcePrimitiveFrame,sourceBarycentricGradient} from './lib/frontside-source-primitive-frame.mjs';
const close=(a,b,tolerance=1e-12)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<=tolerance,`${v} vs ${b[i]}`));
const source={viewPositions:[[0,0,-2],[2,0,-2],[0,4,-2]],viewVertexNormals:[[0,0,1],[0,0,1],[0,0,1]],uv:[[.1,.2],[.9,.2],[.1,.8]],weights:[.5,.25,.25],baryDx:[-.05,.05,0],baryDy:[-.025,0,.025]};
test('primitive gradients preserve non-square geometry and authored UV units',()=>{
 const f=sourcePrimitiveFrame(source);close(f.viewPosition,[.5,1,-2]);close(f.mapUv,[.3,.35]);close(f.viewDx,[.1,0,0]);close(f.viewDy,[0,.1,0]);close(f.uvDx,[.04,0]);close(f.uvDy,[0,.015]);close(f.normal,[0,0,1]);assert.equal(f.geometryRoughness,0);
 close(sourceBarycentricGradient([0,0,2,0,0,3], [.1,.2]),[-.8,.2,.6]);
});
test('quad parity uses the same source normal field even outside triangle coverage',()=>{
 const varied={...source,weights:[.01,.98,.01],baryDx:[-.04,.04,0],viewVertexNormals:[[0,0,1],[.6,0,.8],[0,.6,.8]]};
 const even=sourcePrimitiveFrame(varied),odd=sourcePrimitiveFrame({...varied,weights:varied.weights.map((v,i)=>v+varied.baryDx[i]),pixelParity:[1,0]});
 close(even.normalDx,odd.normalDx);assert.ok(even.geometryRoughness>0);assert.ok(varied.weights[0]+varied.baryDx[0]<0);
 const back=sourcePrimitiveFrame({...varied,faceDirection:-1});close(back.normal,even.normal.map(v=>-v));close(back.tangent,even.tangent);close(back.bitangent,even.bitangent);
});
