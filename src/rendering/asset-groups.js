import * as THREE from 'three';
import {nativePropBatchVisible} from './prop-transition-residency.js';
import {createAssetShadow} from './asset-shadows.js';

export function createSmoothObstructionMaterial(base){
            const material=base.clone(),compile=base.onBeforeCompile,cacheKey=base.customProgramCacheKey.bind(base);
            material.side=THREE.FrontSide;material.transparent=true;material.depthWrite=false;material.alphaToCoverage=false;material.forceSinglePass=true;
            material.onBeforeCompile=(shader,renderer)=>{compile.call(base,shader,renderer);
              shader.fragmentShader=shader.fragmentShader.replace('if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}','if(vNativeVisibility<.002)discard;');
              shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=clamp(vNativeVisibility,0.,1.);\n#include <opaque_fragment>');
            };
            material.customProgramCacheKey=()=>cacheKey()+'|native-partial-blend-v1';
  return material;
}

const powerCapacity=count=>2**Math.ceil(Math.log2(Math.max(8,count)));
function addDirtyRange(attribute,start,end){
  // A disabled/cached pass may never upload. Keep pending intervals disjoint,
  // so repeated edits cannot grow bookkeeping with the number of frames.
  const ranges=attribute.updateRanges;
  for(let i=ranges.length-1;i>=0;i--){
    const r=ranges[i];if(r.start>end||r.start+r.count<start)continue;
    start=Math.min(start,r.start);end=Math.max(end,r.start+r.count);ranges.splice(i,1);
  }
  attribute.addUpdateRange(start,end-start);
}
function transferStaticAttributes(source,destination){
  const names=Object.keys(source.attributes).filter(name=>name!=='nativeVisibility');
  const other=Object.keys(destination.attributes).filter(name=>name!=='nativeVisibility');
  const same=(a,b)=>!a&&!b||!!a&&!!b&&a.array===b.array&&a.itemSize===b.itemSize&&a.normalized===b.normalized&&a.usage===b.usage;
  const previous=source.userData.nativeStaticVersions,next=destination.userData.nativeStaticVersions;
  if(!previous||!next||previous.index!==next.index||!same(source.index,destination.index)||names.length!==other.length||!names.every(name=>previous.attributes[name]===next.attributes[name]&&same(source.attributes[name],destination.attributes[name])))return;
  // Move private GPU identities only after packing succeeds. The retired
  // geometry must no longer delete buffers now owned by its replacement.
  destination.setIndex(source.index);source.setIndex(null);
  for(const name of names){destination.setAttribute(name,source.attributes[name]);source.deleteAttribute(name);}
}
function geometryView(source,capacity){
  const view=new THREE.BufferGeometry();
  // Share CPU arrays, but own the GPU attribute identities. Retiring a color
  // group must not delete vertex buffers still used by the shadow pass.
  if(source.index)view.setIndex(new THREE.BufferAttribute(source.index.array,source.index.itemSize,source.index.normalized));
  for(const [name,a] of Object.entries(source.attributes))if(name!=='nativeVisibility')view.setAttribute(name,new THREE.BufferAttribute(a.array,a.itemSize,a.normalized));
  // A source updated in place must upload again even when its array is unchanged.
  view.userData.nativeStaticVersions={index:source.index?.version??null,attributes:Object.fromEntries(Object.entries(source.attributes).filter(([name])=>name!=='nativeVisibility').map(([name,a])=>[name,a.version]))};
  view.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1),1).setUsage(THREE.DynamicDrawUsage));
  view.boundingBox=source.boundingBox?.clone()??null;view.boundingSphere=source.boundingSphere?.clone()??null;
  view.groups=source.groups.map(g=>({...g}));view.drawRange={...source.drawRange};return view;
}

export function nativeChunkBounds(group){
  if(group.userData.nativeAssetBounds)return group.userData.nativeAssetBounds;
  group.updateMatrixWorld(true);const box=new THREE.Box3(),temp=new THREE.Box3(),dummy=new THREE.Object3D();
  for(const mesh of group.children)if(mesh.userData.ground){mesh.geometry.computeBoundingBox();box.union(temp.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld));}
  for(const batch of group.userData.lodBatches??[]){
    // Every native variant contributes, including the solid shadow LOD. Reduced
    // geometry need not have exactly the same envelope as the color source.
    const variants=new THREE.Box3();for(const level of batch.levels){if(!level.geometry.boundingBox)level.geometry.computeBoundingBox();variants.union(level.geometry.boundingBox);}
    for(const p of batch.instances){
      dummy.position.set(p.x-batch.chunkOrigin[0],p.y,p.z-batch.chunkOrigin[1]);dummy.rotation.y=p.yaw;dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();dummy.matrix.premultiply(group.matrixWorld);
      box.union(temp.copy(variants).applyMatrix4(dummy.matrix));
    }
  }
  group.userData.nativeAssetBounds=box;return box;
}

export class NativeAssetGroups{
  constructor(scene,{visualSearch=globalThis.location?.search??''}={}){
    this.scene=scene;this.root=new THREE.Group();this.root.name='native_merged_assets';scene.add(this.root);
    this.materialEpoch=0;this.materialEpochs=new WeakMap();this.colors=new Map();this.shadows=new Map();this.shadowRoot=new THREE.Group();this.shadowChunks=new Map([['merged',this.shadowRoot]]);
    this.smoothObstruction=new URLSearchParams(visualSearch).get('visualLab')==='global-lighting';this.enabled=true;this.instanceCulling=true;this.omitZeroColor=false;this.reuseStaticOnResize=true;this.frustum=new THREE.Frustum();this.vp=new THREE.Matrix4();
  }
  // Compile-only representatives borrow immutable geometry. Their materials
  // stay alive until the loading program snapshot has acquired references.
  prepareSmoothWarmup(chunks=new Map()){
    const group=new THREE.Group(),seen=new Set();let disposed=false;
    const sources=[...this.colors.values()].map(value=>value.mesh);
    for(const chunk of chunks.values())for(const batch of chunk.userData.lodBatches??[])sources.push(...batch.levels);
    if(this.smoothObstruction)for(const mesh of sources){
      if(seen.has(mesh.material))continue;seen.add(mesh.material);
      const representative=new THREE.InstancedMesh(mesh.geometry,createSmoothObstructionMaterial(mesh.material),1);
      representative.receiveShadow=true;representative.frustumCulled=false;group.add(representative);
    }
    return {group,dispose(){if(disposed)return;disposed=true;for(const mesh of group.children){mesh.material.dispose();mesh.dispose();}group.clear();}};
  }
  invalidateMaterials(){this.materialEpoch++;}
  retire(cache,key,retainGeometry=false){const g=cache.get(key);for(const fade of g.smoothFades??[]){fade.removeFromParent();fade.geometry.dispose();fade.material.dispose();fade.dispose();}g.mesh.removeFromParent();g.mesh.dispose();if(g.pass==='color'&&!retainGeometry)g.mesh.geometry.dispose();cache.delete(key);}
  clear(){for(const cache of [this.colors,this.shadows])for(const key of [...cache.keys()])this.retire(cache,key);this.shadowRoot.userData.lodBatches=[];}
  prepare(cache,key,entries,pass,stats){
    const count=entries.reduce((n,e)=>n+e.mesh.count,0),capacity=powerCapacity(count),first=entries[0],source=pass==='shadow'?first.batch.levels.at(-1):first.batch.levels[first.level];
    let g=cache.get(key),retiredGeometry=null;
    if(g&&g.capacity!==capacity){
      if(pass==='color'&&this.reuseStaticOnResize)retiredGeometry=g.mesh.geometry;
      this.retire(cache,key,!!retiredGeometry);g=null;
    }
    try{
    if(!g){
      const mesh=pass==='shadow'?createAssetShadow([source],capacity,first.batch.group):new THREE.InstancedMesh(geometryView(source.geometry,capacity),source.material,capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceMatrix.onUpload(()=>mesh.instanceMatrix.clearUpdateRanges());
      if(pass==='color'){const a=mesh.geometry.attributes.nativeVisibility;a.onUpload(()=>a.clearUpdateRanges());}
      mesh.frustumCulled=false;mesh.castShadow=pass==='shadow';mesh.receiveShadow=pass==='color';
      mesh.userData.nativeMergedAsset=true;mesh.userData.nativeMergedPass=pass;
      if(pass==='color')this.root.add(mesh);
      g={mesh,capacity,pass,stamp:null,sourceStamp:null};cache.set(key,g);
    }
    const sourceStamp=(this.smoothObstruction?'smooth|':'dither|')+(pass==='color'&&this.omitZeroColor?'compact|':'full|')+entries.map(e=>e.batch.uid+':'+e.level+':'+e.mesh.count+':'+e.mesh.instanceMatrix.version+':'+(pass==='color'?(e.mesh.geometry.attributes.nativeVisibility?.version??0):0)+':'+e.group.matrixWorld.elements.join(',')).join('|');
    const cull=pass==='color'&&this.instanceCulling;
    const stamp=(cull?this.vp.elements.join(',')+'|':'')+sourceStamp;
    if(stamp!==g.stamp){
      const matrix=new THREE.Matrix4(),sphere=new THREE.Sphere(),boundsMatrix=new THREE.Matrix4();
      if(!source.geometry.boundingSphere)source.geometry.computeBoundingSphere();
      const rebuildBounds=sourceStamp!==g.sourceStamp,bounds=rebuildBounds?new THREE.Sphere().makeEmpty():g.mesh.boundingSphere;
      const visibility=pass==='color'?g.mesh.geometry.attributes.nativeVisibility:null;
      let offset=0,smoothFadeCount=0,matrixStart=Infinity,matrixEnd=0,coverageStart=Infinity,coverageEnd=0;
      for(const e of entries)for(let i=0;i<e.mesh.count;i++){
        const coverage=e.mesh.geometry.attributes.nativeVisibility?.array[i]??1;
        // The logical population and all shadow casters remain unchanged.
        if(pass==='color'&&this.omitZeroColor&&coverage<=0)continue;
        matrix.fromArray(e.mesh.instanceMatrix.array,i*16).premultiply(e.group.matrixWorld);
        let visible=true;
        if(cull){sphere.copy(source.geometry.boundingSphere).applyMatrix4(matrix);sphere.radius+=2.5;visible=this.frustum.intersectsSphere(sphere);}
        matrix.elements[12]-=this.origin.x;matrix.elements[14]-=this.origin.z;
        if(rebuildBounds){
          // Preserve Three's original draw-sorting bounds, including culled color
          // instances, in the Float32 coordinates actually submitted to GL.
          for(let k=0;k<16;k++)boundsMatrix.elements[k]=Math.fround(matrix.elements[k]);
          bounds.union(sphere.copy(source.geometry.boundingSphere).applyMatrix4(boundsMatrix));
        }
        if(!visible)continue;
        const smoothVisibility=coverage;
        if(this.smoothObstruction&&pass==='color'&&smoothVisibility<.999){
          if(smoothVisibility<.002)continue;
          g.smoothFades??=[];let fade=g.smoothFades[smoothFadeCount];
          if(!fade){
            const material=createSmoothObstructionMaterial(source.material);
            fade=new THREE.InstancedMesh(geometryView(source.geometry,1),material,1);fade.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fade.instanceMatrix.onUpload(()=>fade.instanceMatrix.clearUpdateRanges());const a=fade.geometry.attributes.nativeVisibility;a.onUpload(()=>a.clearUpdateRanges());fade.name='native-obstruction-blend';fade.userData.materialRegistryExcluded=true;fade.receiveShadow=true;this.root.add(fade);g.smoothFades.push(fade);
          }
          let fadeStart=Infinity,fadeEnd=0;
          for(let k=0;k<16;k++){const value=Math.fround(matrix.elements[k]);if(fade.instanceMatrix.array[k]!==value){fade.instanceMatrix.array[k]=value;fadeStart=Math.min(fadeStart,k);fadeEnd=k+1;}}
          const fadeVisibility=fade.geometry.attributes.nativeVisibility;
          const fadeCoverageChanged=fadeVisibility.array[0]!==Math.fround(smoothVisibility);
          if(fadeEnd){addDirtyRange(fade.instanceMatrix,fadeStart,fadeEnd);fade.instanceMatrix.needsUpdate=true;}
          if(fadeCoverageChanged){fadeVisibility.array[0]=smoothVisibility;addDirtyRange(fadeVisibility,0,1);fadeVisibility.needsUpdate=true;}
          if(fadeEnd||fadeCoverageChanged)stats.uploads++;
          fade.boundingSphere=null;fade.boundingBox=null;fade.visible=true;smoothFadeCount++;continue;
        }
        for(let k=0;k<16;k++){
          const index=offset*16+k,value=Math.fround(matrix.elements[k]);
          if(g.mesh.instanceMatrix.array[index]!==value){g.mesh.instanceMatrix.array[index]=value;matrixStart=Math.min(matrixStart,index);matrixEnd=index+1;}
        }
        if(visibility&&visibility.array[offset]!==Math.fround(coverage)){
          visibility.array[offset]=coverage;coverageStart=Math.min(coverageStart,offset);coverageEnd=offset+1;
        }
        offset++;
      }
      // Count is draw state, not buffer content. Unchanged prefixes need no upload.
      for(let i=smoothFadeCount;i<(g.smoothFades?.length??0);i++)g.smoothFades[i].visible=false;
      g.mesh.count=offset;
      if(matrixEnd){addDirtyRange(g.mesh.instanceMatrix,matrixStart,matrixEnd);g.mesh.instanceMatrix.needsUpdate=true;}
      if(coverageEnd){addDirtyRange(visibility,coverageStart,coverageEnd);visibility.needsUpdate=true;}
      if(matrixEnd||coverageEnd)stats.uploads++;
      g.mesh.boundingBox=null;g.mesh.boundingSphere=bounds;g.sourceStamp=sourceStamp;g.stamp=stamp;
    }
    // Quality can change while an LOD material has no scene mesh. Refresh it
    // when selected again, including fade clones created after the switch.
    if(pass==='color'&&this.materialEpoch&&(g.materialEpoch!==this.materialEpoch||g.materialFadeCount!==(g.smoothFades?.length??0))){for(const mesh of [g.mesh,...(g.smoothFades??[])]){const material=mesh.material;if(this.materialEpochs.get(material)!==this.materialEpoch){material.needsUpdate=true;this.materialEpochs.set(material,this.materialEpoch);}}g.materialEpoch=this.materialEpoch;g.materialFadeCount=g.smoothFades?.length??0;}
    stats.bytes+=capacity*(pass==='color'?68:64);
    if(pass==='shadow')this.shadowRoot.userData.lodBatches.push({shadow:g.mesh,meshes:[g.mesh]});
    if(retiredGeometry)transferStaticAttributes(retiredGeometry,g.mesh.geometry);
    }finally{retiredGeometry?.dispose();}
  }
  update(chunks,camera,origin={x:0,z:0},light=null){
    if(!this.origin||this.origin.x!==origin.x||this.origin.z!==origin.z){
      this.origin={x:origin.x,z:origin.z};this.root.position.set(origin.x,0,origin.z);
      this.shadowRoot.position.copy(this.root.position);this.shadowRoot.updateMatrixWorld(true);
      for(const cache of [this.colors,this.shadows])for(const group of cache.values()){group.stamp=null;group.sourceStamp=null;}
    }
    const stats={colorGroups:0,shadowGroups:0,visibleChunks:0,uploads:0,bytes:0,rawColorSlices:0,shadowChunks:0,culledShadowChunks:0};
    this.stats=stats;this.shadowRoot.userData.lodBatches=[];this.shadowChunks=new Map([['merged',this.shadowRoot]]);
    if(!this.enabled){this.clear();for(const group of chunks.values())for(const b of group.userData.lodBatches??[])for(const m of b.meshes)m.layers.set(!nativePropBatchVisible(group,b)?31:0);return stats;}
    camera.updateMatrixWorld(true);this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.vp);
    let lightVolume=null;
    if(this.shadowCulling!==false&&light?.isDirectionalLight&&light.castShadow){
      light.updateWorldMatrix(true,false);light.target.updateWorldMatrix(true,false);
      light.shadow.updateMatrices(light);lightVolume=light.shadow.getFrustum();
    }
    const colorEntries=new Map(),shadowEntries=new Map();
    const add=(map,key,entry)=>{if(!map.has(key))map.set(key,[]);map.get(key).push(entry);};
    for(const [key,group] of chunks){
      group.updateMatrixWorld(true);const bounds=nativeChunkBounds(group),visible=group.visible&&this.frustum.intersectsBox(bounds),casts=group.visible&&(!lightVolume||lightVolume.intersectsBox(bounds));if(visible)stats.visibleChunks++;
      if(group.visible){if(casts)stats.shadowChunks++;else stats.culledShadowChunks++;}
      const raw=[];
      for(const batch of group.userData.lodBatches??[]){
        if(batch.clip){if(casts)raw.push(batch);continue;}
        for(const [level,mesh] of batch.meshes.entries()){
          mesh.layers.set(31);if(!nativePropBatchVisible(group,batch)||!group.visible||!mesh.visible||!mesh.material.visible||!mesh.count)continue;
          const entry={group,batch,level,mesh};
          if(visible){add(colorEntries,batch.slot+':'+level,entry);stats.rawColorSlices++;}
          if(casts&&batch.group!==2)add(shadowEntries,String(batch.slot),entry);
        }
      }
      if(raw.length){const shadowGroup={visible:group.visible,matrixWorld:group.matrixWorld,userData:{lodBatches:raw}};this.shadowChunks.set(key,shadowGroup);}
    }
    for(const [key,entries] of colorEntries)this.prepare(this.colors,key,entries,'color',stats);
    for(const [key,entries] of shadowEntries)this.prepare(this.shadows,key,entries,'shadow',stats);
    for(const [cache,entries] of [[this.colors,colorEntries],[this.shadows,shadowEntries]])for(const key of [...cache.keys()])if(!entries.has(key))this.retire(cache,key);
    stats.colorGroups=this.colors.size;stats.shadowGroups=this.shadows.size;return stats;
  }
  dispose(){this.clear();this.root.removeFromParent();}
}
