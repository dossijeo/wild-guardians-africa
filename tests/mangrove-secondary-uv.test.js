import test from 'node:test';
import assert from 'node:assert/strict';
import {patchMangroveMoss} from '../src/rendering/global-mangrove-moss.js';
test('secondary moss UV retains integer origin periods before rescaling',()=>{
 const source=patchMangroveMoss('vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;\n  float fade=1.;');
 assert.ok(source.includes('uv+floor(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x)'));
 const rotate=([x,z])=>[.8*x+.6*z,-.6*x+.8*z];
 for(const scale of [.2,.55,1.3])for(const origin of [[48,0],[-48,192],[4800,-9600]]){
  const world=rotate([82,18]).map(x=>x*scale),local=rotate([82-origin[0],18-origin[1]]).map(x=>x*scale),offset=rotate(origin).map(x=>x*scale);
  const restored=local.map((x,i)=>x+(offset[i]-Math.floor(offset[i]))+Math.floor(offset[i]));
  for(let i=0;i<2;i++)assert.ok(Math.abs(restored[i]*.57-world[i]*.57)<1e-9);
 }
});
