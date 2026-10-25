import * as THREE from 'three';
import {MaterialBakeQueue} from '/src/rendering/material-bake-queue.js';
// QA only. Small real targets exercise ownership without changing world materials.
export function verifyMaterialBakeLifecycle(w){
 const r=w.renderer,base=r.info.memory.textures,q=new MaterialBakeQueue({budgetBytes:2048}),samples=[],published=[];
 const snap=label=>samples.push({label,textures:r.info.memory.textures-base,bytes:q.stats.bytes,published:[...published]});
 const spec=version=>({version,bytes:1024,tiles:3,
  create:()=>new THREE.WebGLRenderTarget(16,16,{depthBuffer:false,generateMipmaps:false}),
  draw(target){const saved=r.getRenderTarget();try{r.setRenderTarget(target);r.clear(true,false,false);}finally{r.setRenderTarget(saved);}},
  publish(){published.push(version);},destroy:target=>target.dispose()});
 try{
  q.request('chunk',spec(1));q.step();q.step();q.step();snap('resident');
  q.request('chunk',spec(2));q.step();snap('old-plus-partial');
  q.request('chunk',spec(3));snap('cancelled-stale');q.step();snap('latest-partial');
  q.remove('chunk');snap('unloaded');q.step();
  q.request('chunk',spec(4));q.step();q.step();q.step();snap('reloaded');
  q.dispose();snap('disposed');
  const expected=[1,2,1,2,0,1,0];
  if(samples.some((s,i)=>s.textures!==expected[i]))throw Error('Material cache resource ownership mismatch '+JSON.stringify(samples));
  if(published.join(',')!=='1,4')throw Error('Stale material publication');
  return {samples,stats:q.stats,glError:r.getContext().getError(),scope:'Real render target lifecycle; no visual or timing claim'};
 }finally{q.dispose();}
}
