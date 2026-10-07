import {nativeTreeDiagnosticBounds} from './native-tree-diagnostic-bounds.js';
import {nativeFarRenderSignature,nativeFarPackingSignature} from './native-far-render-signature.js';
import {NativeTreeStandby,standbyTreeKey,standbyCoverageReady,finalizeStandbyMaterials} from './native-tree-standby.js';
import {nativeTreePresence} from './native-tree-presence.js';
import {logicalNativeStandbyEntries} from './logical-native-standby.js';
import {NativeFarLayer} from './native-far-layer.js';
import {NativeTreeCoverage} from './native-tree-coverage.js';
import {NativePreparedTreeCoverage} from './native-prepared-tree-coverage.js';
import {FarRegionTracker,farRegionRequest} from './far-region-tracker.js';
import {NativeFarGpuCancelled,prepareNativeFarGpu,releaseNativeFarGpuCache,nativeFarGpuRevision,nativeFarGpuContextLost} from './prepare-native-far-gpu.js';
import {nativeChunkBounds} from '../../src/rendering/asset-groups.js';
import {skyNight} from '../../src/rendering/sky.js';
import {Fog,Frustum,Matrix4,Color} from 'three';
import {attachNativeFarGround} from './native-far-ground.js';
import {farAtmosphere} from '../../src/rendering/far-atmosphere.js';

// Explicit QA opt-in. Atlas resources remain owned by the caller.
export async function attachNativeFarWorld(world,{cancelled:ownerCancelled=()=>false,metadata,texture,prelitAtlas,slot=0,ownsWorld=true,includeGround=true,simplifiedFarGround=false,bakedOnly=false,logicalStandbyPreload=false,groundTreeBases=null,groundStep=8,start=100,end=140,treeHalf=400,densityStart=180,densityEnd=280,densityMinimum=.08,importanceHeight=16,importanceMaxBoost=4,fadeStart=280,fadeEnd=330,fogStart=160,fogEnd=380,fogDayColor='#b5d9e8',fogNightColor='#263747'}){
 if(typeof logicalStandbyPreload!=='boolean')throw Error('Invalid logical standby option');
 if(typeof simplifiedFarGround!=='boolean')throw Error('Invalid simplified far ground option');
 farAtmosphere({fogStart,fogEnd,fogDayColor,fogNightColor});
 if(![densityStart,densityEnd,densityMinimum,fadeStart,fadeEnd].every(Number.isFinite)||densityStart<end||densityEnd<=densityStart||densityMinimum<0||densityMinimum>1||fadeStart<densityEnd||fadeEnd<=fadeStart||fadeEnd>treeHalf-64)throw Error('Invalid native far landscape distances');
 if(!Number.isInteger(slot)||slot<0||slot>3||world.nav.config.biome==='canyons'&&slot>1)throw Error('Invalid native far species slot');
 if(ownsWorld&&world.farVegetation)throw Error('Far layer already attached');
 let closed=false,busy=false,lastRequested=null;const attachedSeed=world.state.seed;
 const isCancelled=()=>closed||world.disposed||world.state?.seed!==attachedSeed||ownerCancelled();
 // Readiness modifies color visibility and consequently merged matrix versions.
 // Those versions must not invalidate the preparation that enabled that fade.
 const errors=[],coverage=new NativeTreeCoverage(slot),signature=()=>nativeFarRenderSignature(world,slot);
 const frustum=new Frustum(),vp=new Matrix4();
 const prepared=new NativePreparedTreeCoverage(coverage,signature,record=>nativeFarPackingSignature(world,record)),tracker=new FarRegionTracker({x:world.camera.position.x,z:world.camera.position.z});
 const stats={cancelledRegions:0,regions:0,nativePreparations:0,stalePreparations:0,preparationAttempts:0,fencedPreparations:0,rejectedPacking:0,signatureChanges:0,packingChanges:0,cachedTextures:0,textureUploads:0,logicalPreloads:0,logicalPreloadEntries:0,errors};
 finalizeStandbyMaterials(world.toon,world.prototypes[slot]);
 const textures=new Set([texture,prelitAtlas.day,prelitAtlas.night]);
 for(const source of world.prototypes[slot])for(const value of Object.values(source.material))if(value?.isTexture)textures.add(value);
 const fog=new Fog(fogDayColor,fogStart,fogEnd),fogDay=new Color(fogDayColor),fogNight=new Color(fogNightColor);
 const layer=new NativeFarLayer({scene:world.scene,source:world.prototypes[slot][0],texture,metadata,treesOnly:!includeGround,selectTrees:trees=>trees.filter(t=>t.slot===slot),attachData:(p,data)=>{if(data.ground)attachNativeFarGround(p,data.ground,world,{simplified:simplifiedFarGround});},options:{toon:bakedOnly?null:world.toon,prelitAtlas,start,end,slot,importanceHeight,importanceMaxBoost,seed:world.state.seed},prepare:async(candidate,cancelled)=>{
  if(bakedOnly)candidate.uniforms.uNight=world.toon.uniforms.uNight;
  candidate.uniforms.uDensityEnabled.value=1;candidate.uniforms.uDensityRange.value.set(densityStart,densityEnd);candidate.uniforms.uDensityMinimum.value=densityMinimum;candidate.uniforms.uDistanceFadeRange.value.set(fadeStart,fadeEnd);
  candidate.uniforms.uFarOrigin.value.set(world.renderOrigin.x,world.renderOrigin.z);
  await prepareNativeFarGpu(world.renderer,candidate.impostors,world.scene,world.camera,[texture,prelitAtlas.day,prelitAtlas.night],{cancelled:()=>cancelled()||isCancelled()});
 }});
 const standby=new NativeTreeStandby({scene:world.scene,sources:world.prototypes[slot],start,end,resourceRevision:()=>nativeFarGpuRevision(world.renderer),onError:error=>errors.push(String(error)),prepare:(root,cancelled)=>prepareNativeFarGpu(world.renderer,root,world.scene,world.camera,textures,{cancelled:()=>cancelled()||isCancelled(),diagnoseErrors:world.farGpuDiagnostics===true})});
 let physicalIds=nativeTreePresence(world);
 const standbyAvailable=(id,suppressed)=>standbyCoverageReady(id,{coverage,standby,nativeTree:nativeReferences.get(id)?.tree,logicalTree:layer.current?.treeById.get(id),suppressed,nativeMissing:!physicalIds.has(id)});
 // Starting a fade also requires its owned backup fence: native packing may
 // change on the next camera update, before a first standby upload completes.
 const joint={get revision(){return prepared.revision+':'+standby.revision+':'+layer.revision+':'+world.chunkRevision;},has(id,suppressed){return standbyAvailable(id,suppressed);}};
 let referencesRevision=-1;const nativeReferences=new Map();
 let logicalPlan=null;
 function scheduleLogicalPreload(currentSignature){
  if(!logicalStandbyPreload||!layer.current||isCancelled()||nativeFarGpuContextLost(world.renderer))return;
  const camera=world.camera.position,x=Math.round(camera.x/8),y=Math.round(camera.y/8),z=Math.round(camera.z/8),suppressed=world.nav.suppressed;
  if(logicalPlan?.x===x&&logicalPlan.y===y&&logicalPlan.z===z&&logicalPlan.region===layer.revision&&logicalPlan.chunk===world.chunkRevision&&logicalPlan.quality===world.quality&&logicalPlan.signature===currentSignature&&logicalPlan.suppressed===suppressed)return;
  logicalPlan={x,y,z,region:layer.revision,chunk:world.chunkRevision,quality:world.quality,signature:currentSignature,suppressed};const entries=logicalNativeStandbyEntries(layer.current.trees,{metadata,camera,quality:world.quality,range:end+24,physicalIds,suppressed,maxTrees:standby.maxTrees,levels:world.prototypes[slot].length});
  stats.logicalPreloads++;stats.logicalPreloadEntries=entries.length;if(entries.length)standby.request(entries,camera);
 }
 function frozenEntries(snapshot){const rows=[],matrix=new Matrix4();for(const [,record] of snapshot.entries){record.group.updateMatrixWorld(true);for(const [i,index] of record.batch.orders[record.level].entries()){const tree=record.batch.instances[index];if(!record.ids.has(tree.id))continue;matrix.fromArray(record.mesh.instanceMatrix.array,i*16).premultiply(record.group.matrixWorld);rows.push({id:tree.id,key:standbyTreeKey(tree),x:tree.x,z:tree.z,level:record.level,matrix:matrix.toArray()});}}return rows;}
 async function region(center){
  const key=center.x+':'+center.z;if(lastRequested===key)return;lastRequested=key;
  try{const result=await layer.request(key,{...farRegionRequest(world.nav.config,world.pack.profile,center,{treeHalf,groundHalf:treeHalf+32,step:groundStep}),waterSurface:bakedOnly,treeBase:metadata.localBase,treeBases:groundTreeBases,slots:includeGround&&groundTreeBases?Object.keys(groundTreeBases).map(Number):[slot]});if(result)stats.regions++;}
  catch(error){if(!isCancelled()){if(error instanceof NativeFarGpuCancelled){if(lastRequested===key)lastRequested=null;stats.cancelledRegions++;}else errors.push(String(error));}}
 }
 function schedulePreparation(){
  if(isCancelled()||busy||nativeFarGpuContextLost(world.renderer)||!coverage.counts.size||[...coverage.counts.keys()].every(id=>prepared.has(id)))return;
  busy=true;stats.preparationAttempts++;
  // Native merged batches are updated later in the synchronous render call.
  Promise.resolve().then(async()=>{
   if(isCancelled())return;
   const snapshot=prepared.capture(),cancelled=()=>isCancelled()||snapshot.signature!==signature();
   standby.request(frozenEntries(snapshot),world.camera.position);
   try{
    const result=await prepareNativeFarGpu(world.renderer,world.assetGroups.root,world.scene,world.camera,textures,{cancelled,diagnoseErrors:world.farGpuDiagnostics===true});
    stats.fencedPreparations++;stats.cachedTextures+=result.cachedTextures;stats.textureUploads+=result.textureUploads.length;if(prepared.complete(snapshot))stats.nativePreparations++;else stats.rejectedPacking++;
   }catch(error){if(!closed){if(error instanceof NativeFarGpuCancelled)stats.stalePreparations++;else errors.push(String(error));}}
  }).finally(()=>busy=false);
 }
 const adapter={layer,stats,enabled:true,readinessDiagnosis(id){const physical=[];for(const [chunk,group]of world.chunks)for(const batch of group.userData.lodBatches??[]){const index=batch.instances.findIndex(tree=>tree.id===id);if(index<0)continue;const bounds=nativeChunkBounds(group),tree=batch.instances[index],treeBounds=nativeTreeDiagnosticBounds(group,batch,tree);physical.push({treeFrustum:frustum.intersectsBox(treeBounds),treeBounds:[treeBounds.min.toArray(),treeBounds.max.toArray()],nativeKey:standbyTreeKey(tree),chunk,groupVisible:group.visible,propsVisible:group.userData.farPropsVisible!==false,treesVisible:group.userData.farTreesVisible,treeSlots:group.userData.farTransitionTreeSlots,frustum:frustum.intersectsBox(bounds),bounds:[bounds.min.toArray(),bounds.max.toArray()],tree:[tree.x,tree.y,tree.z],slot:batch.slot,orders:batch.orders.map(rows=>rows.includes(index)),counts:batch.meshes.map(m=>m.count)});}const logical=layer.current?.treeById.get(id),logicalKey=logical?standbyTreeKey(logical):null,bankEntries=standby.banks.map((bank,index)=>{const entry=bank?.entries?.get(id);return entry?{index,active:bank===standby.active,key:entry.key,level:entry.level,resource:entry.resource,currentResource:standby.sourceKey(entry.level)}:null;});return {logicalKey,bankEntries,physical,nativeMissing:!physicalIds.has(id),retainedPrepared:standby.has(id,layer.current?.treeById.get(id),world.nav.suppressed),standbyAvailable:standbyAvailable(id,world.nav.suppressed),coverage:coverage.has(id),prepared:prepared.has(id),nativeRevision:coverage.revision,preparedRevision:prepared.revision,renderSignature:signature(),proofSignature:prepared.renderSignature,batches:[...coverage.batches].filter(([,record])=>record.ids.has(id)).map(([batch,record])=>({stamp:record.stamp,accepted:prepared.prepared.get(batch)===record,level:record.level,resourceSignature:nativeFarPackingSignature(world,record),levels:record.batch.meshes.map(m=>({count:m.count,visible:m.visible,matrixVersion:m.instanceMatrix.version}))}))};},update(dt){
  if(isCancelled()){this.dispose();return;}fog.color.copy(fogDay).lerp(fogNight,skyNight(world.state));world.scene.fog=fog;layer.current?.prototype.updateGroundBounds?.();const next=tracker.update(world.camera.position.x,world.camera.position.z,performance.now());if(!nativeFarGpuContextLost(world.renderer)&&(next||lastRequested!==tracker.center.x+':'+tracker.center.z))void region(next??tracker.center);
  world.camera.updateMatrixWorld(true);frustum.setFromProjectionMatrix(vp.multiplyMatrices(world.camera.projectionMatrix,world.camera.matrixWorldInverse));
  physicalIds=nativeTreePresence(world);
  const visible=new Map([...world.chunks].filter(([,group])=>group.visible&&(group.userData.farPropsVisible!==false||group.userData.farTreesVisible===true&&group.userData.farTransitionTreeSlots?.includes(slot))&&frustum.intersectsBox(nativeChunkBounds(group))));
  if(coverage.update(visible))stats.packingChanges++;prepared.update();const currentSignature=signature();if(stats.signature!==undefined&&stats.signature!==currentSignature)stats.signatureChanges++;stats.coverage=coverage.counts.size;stats.prepared=prepared.counts.size;stats.signature=currentSignature;schedulePreparation();
  if(referencesRevision!==coverage.revision){nativeReferences.clear();for(const [,record] of coverage.batches)for(const index of record.batch.orders[record.level]){const tree=record.batch.instances[index];if(record.ids.has(tree.id))nativeReferences.set(tree.id,{batch:record.batch,index,tree});}referencesRevision=coverage.revision;}
  scheduleLogicalPreload(currentSignature);
  if(layer.current)layer.current.prototype.impostors.visible=this.enabled;
  if(this.enabled){layer.update(world.chunks,world.camera,joint,true,dt,world.renderOrigin,world.nav.suppressed,prepared);if(layer.current)standby.update(world.camera.position,layer.current.treeById,id=>layer.current.prototype.treeState(id),id=>prepared.has(id)||!standbyAvailable(id,world.nav.suppressed),world.nav.suppressed,id=>{const ref=nativeReferences.get(id);return ref?.batch.fade?.attribute.getX(ref.index)??1;});}
  else layer.fade.update(world.chunks,world.camera,()=>null,'disabled');
  if(standby.active)standby.active.root.visible=this.enabled;stats.standby=standby.stats;
 },dispose(){if(closed)return;closed=true;standby.dispose();nativeReferences.clear();layer.dispose(world.chunks,world.camera);prepared.clear();coverage.clear();if(ownsWorld)releaseNativeFarGpuCache(world.renderer);if(world.farVegetation===adapter)world.farVegetation=null;}};
 if(ownsWorld)world.farVegetation=adapter;
 await region(tracker.center);
 if(isCancelled()){adapter.dispose();throw Error('Far world attachment cancelled');}
 return adapter;
}
