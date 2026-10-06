import {NativeFarLayer} from './native-far-layer.js';
import {NativeTreeCoverage} from './native-tree-coverage.js';
import {NativePreparedTreeCoverage} from './native-prepared-tree-coverage.js';
import {FarRegionTracker,farRegionRequest} from './far-region-tracker.js';
import {prepareNativeFarGpu} from './prepare-native-far-gpu.js';
import {nativeChunkBounds} from '../../src/rendering/asset-groups.js';
import {skyNight} from '../../src/rendering/sky.js';
import {Fog,Frustum,Matrix4,Color} from 'three';
import {attachNativeFarGround} from './native-far-ground.js';

// Explicit QA opt-in. Atlas resources remain owned by the caller.
export async function attachNativeFarWorld(world,{metadata,texture,prelitAtlas,start=100,end=140,treeHalf=400,densityStart=180,densityEnd=280,densityMinimum=.08,fadeStart=280,fadeEnd=330}){
 if(![densityStart,densityEnd,densityMinimum,fadeStart,fadeEnd].every(Number.isFinite)||densityStart<end||densityEnd<=densityStart||densityMinimum<0||densityMinimum>1||fadeStart<densityEnd||fadeEnd<=fadeStart||fadeEnd>treeHalf-64)throw Error('Invalid native far landscape distances');
 if(world.nav.config.biome!=='savanna')throw Error('Native far experiment requires savanna');
 if(world.farVegetation)throw Error('Far layer already attached');
 let closed=false,busy=false,lastRequested=null;
 // Readiness modifies color visibility and consequently merged matrix versions.
 // Those versions must not invalidate the preparation that enabled that fade.
 const errors=[],coverage=new NativeTreeCoverage(),signature=()=>world.renderOrigin.revision+'|'+[...world.assetGroups.colors.values()].map(g=>[g.mesh.geometry.uuid,g.mesh.material.uuid,g.mesh.material.version].join(':')).join('|');
 const frustum=new Frustum(),vp=new Matrix4();
 const prepared=new NativePreparedTreeCoverage(coverage,signature),tracker=new FarRegionTracker({x:world.camera.position.x,z:world.camera.position.z});
 const stats={regions:0,nativePreparations:0,stalePreparations:0,errors};
 const textures=new Set([texture,prelitAtlas.day,prelitAtlas.night]);
 for(const source of world.prototypes[0])for(const value of Object.values(source.material))if(value?.isTexture)textures.add(value);
 const fog=new Fog('#b5d9e8',160,380),fogDay=new Color('#b5d9e8'),fogNight=new Color('#263747');
 const layer=new NativeFarLayer({scene:world.scene,source:world.prototypes[0][0],texture,metadata,treesOnly:false,attachData:(p,data)=>attachNativeFarGround(p,data.ground,world),options:{toon:world.toon,prelitAtlas,start,end,seed:world.state.seed},prepare:async(candidate,cancelled)=>{
  candidate.uniforms.uDensityEnabled.value=1;candidate.uniforms.uDensityRange.value.set(densityStart,densityEnd);candidate.uniforms.uDensityMinimum.value=densityMinimum;candidate.uniforms.uDistanceFadeRange.value.set(fadeStart,fadeEnd);
  candidate.uniforms.uFarOrigin.value.set(world.renderOrigin.x,world.renderOrigin.z);
  await prepareNativeFarGpu(world.renderer,candidate.impostors,world.scene,world.camera,[texture,prelitAtlas.day,prelitAtlas.night],{cancelled});
 }});
 async function region(center){
  const key=center.x+':'+center.z;if(lastRequested===key)return;lastRequested=key;
  try{const result=await layer.request(key,{...farRegionRequest(world.nav.config,world.pack.profile,center,{treeHalf,groundHalf:treeHalf+32,step:8}),treeBase:metadata.localBase});if(result)stats.regions++;}
  catch(error){if(!closed){lastRequested=null;errors.push(String(error));}}
 }
 function schedulePreparation(){
  if(closed||busy||!coverage.counts.size||[...coverage.counts.keys()].every(id=>prepared.has(id)))return;
  busy=true;
  // Native merged batches are updated later in the synchronous render call.
  Promise.resolve().then(async()=>{
   if(closed)return;
   const snapshot=prepared.capture(),cancelled=()=>closed||snapshot.signature!==signature();
   const meshes=[];world.assetGroups.root.traverse(o=>{if(o.isMesh){meshes.push([o,o.frustumCulled]);o.frustumCulled=false;}});
   try{
    await prepareNativeFarGpu(world.renderer,world.assetGroups.root,world.scene,world.camera,textures,{cancelled});
    if(prepared.complete(snapshot))stats.nativePreparations++;
   }catch(error){if(!closed){if(cancelled())stats.stalePreparations++;else errors.push(String(error));}}
   finally{for(const [mesh,culled] of meshes)mesh.frustumCulled=culled;}
  }).finally(()=>busy=false);
 }
 const adapter={layer,stats,enabled:true,update(dt){
  if(closed)return;fog.color.copy(fogDay).lerp(fogNight,skyNight(world.state));world.scene.fog=fog;layer.current?.prototype.updateGroundBounds();const next=tracker.update(world.camera.position.x,world.camera.position.z,performance.now());if(next)void region(next);
  world.camera.updateMatrixWorld(true);frustum.setFromProjectionMatrix(vp.multiplyMatrices(world.camera.projectionMatrix,world.camera.matrixWorldInverse));
  const visible=new Map([...world.chunks].filter(([,group])=>group.visible&&frustum.intersectsBox(nativeChunkBounds(group))));
  coverage.update(visible);prepared.update();schedulePreparation();
  if(layer.current)layer.current.prototype.impostors.visible=this.enabled;
  if(this.enabled)layer.update(world.chunks,world.camera,prepared,true,dt,world.renderOrigin,world.nav.suppressed);
  else layer.fade.update(world.chunks,world.camera,()=>null,'disabled');
 },dispose(){if(closed)return;closed=true;layer.dispose(world.chunks,world.camera);prepared.clear();coverage.clear();if(world.farVegetation===adapter)world.farVegetation=null;}};
 world.farVegetation=adapter;
 await region(tracker.center);
 if(closed)throw Error('Far world attachment cancelled');
 return adapter;
}
