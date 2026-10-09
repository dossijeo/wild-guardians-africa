import {cropSpec} from '../../src/simulation/rules.js';
import {installLiveGrowthBufferProbe} from './frontside-live-growth-buffer-probe.mjs';
import {installWorldMaizeQaAdapter} from './frontside-world-maize-adapter.mjs';

// Separate native functional readback campaign; never call from GPU timing.
export function runWorldLiveGrowthBindings({world,state,targetId,payload,depthEnabled,scope}){
 const target=state.plants.find(p=>p.alive&&p.id===targetId&&p.species==='maiz');if(!target)throw Error('Pinned maize target absent');
 const mesh=world.scene.children.find(m=>m.isInstancedMesh&&m.name==='maiz_05_maduro');if(!mesh)throw Error('Native mature maize mesh absent');
 const duration=cropSpec('maiz').growth_seconds,previousGrowth=target.growth,rows=[];let adapter=null,label=null;
 const probe=installLiveGrowthBufferProbe(world.renderer,mesh,{limit:64,readbackByteLimit:2*1024*1024,label:()=>label});
 scope.defer('live growth probe hooks',()=>probe.dispose());scope.defer('live growth candidate adapter',()=>adapter?.dispose());
 try{
  for(const [step,candidate] of [false,true,false,true].entries()){
   adapter?.dispose();adapter=null;if(candidate)adapter=installWorldMaizeQaAdapter(world,payload,{worldDepth:depthEnabled});world.destructionPass.materialArrayDepth=depthEnabled;world.releaseNativeShadow.cache.enabled=false;world.releaseNativeShadow.cache.invalidate();
   for(const fraction of [.97,.985,1]){
    scope.assertOpen();target.growth=duration*fraction;const sample=world.cropBatch.sample('maiz',target.growth);
    if(sample.phase!=='original'||sample.stage!==4)throw Error('Prospective live growth input is outside the original mature mesh stage');
    label={step,candidate,targetId,fraction};probe.capture(true);try{world.render(0);}finally{probe.capture(false);}
    rows.push({step,candidate,targetId,fraction,phase:sample.phase,stage:sample.stage,meshCount:mesh.count});
   }
  }
  return{status:'NATIVE_LIVE_GROWTH_BINDINGS_OBSERVED_NOT_MODEL_APPROVAL',targetId,sequence:[false,true,false,true],fractions:[.97,.985,1],rows,probe:probe.snapshot(),limitations:['Explicit QA growth inputs on a pinned state-copy target, not elapsed gameplay or continuous user review.','Bound iGrowth readback and GL queries intentionally perturb rendering; there are no GPU timing results.','Buffer object tokens have meaning only within this context. Other attributes, maps, animation rig and shader appearance remain outside this probe.']};
 }finally{probe.capture(false);probe.dispose();adapter?.dispose();adapter=null;target.growth=previousGrowth;}
}
