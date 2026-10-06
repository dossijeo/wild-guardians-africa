import * as THREE from 'three';
import {createAssetShadow} from './asset-shadows.js';

const powerCapacity=count=>2**Math.ceil(Math.log2(Math.max(8,count)));
function geometryView(source,capacity){
  const view=new THREE.BufferGeometry();
  // Share CPU arrays, but own the GPU attribute identities. Retiring a color
  // group must not delete vertex buffers still used by the shadow pass.
  if(source.index)view.setIndex(new THREE.BufferAttribute(source.index.array,source.index.itemSize,source.index.normalized));
  for(const [name,a] of Object.entries(source.attributes))if(name!=='nativeVisibility')view.setAttribute(name,new THREE.BufferAttribute(a.array,a.itemSize,a.normalized));
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
  constructor(scene){
    this.scene=scene;this.root=new THREE.Group();this.root.name='native_merged_assets';scene.add(this.root);
    this.colors=new Map();this.shadows=new Map();this.shadowRoot=new THREE.Group();this.shadowChunks=new Map([['merged',this.shadowRoot]]);
    this.enabled=true;this.omitZeroColor=false;this.frustum=new THREE.Frustum();this.vp=new THREE.Matrix4();
  }
  retire(cache,key){const g=cache.get(key);g.mesh.removeFromParent();g.mesh.dispose();if(g.pass==='color')g.mesh.geometry.dispose();cache.delete(key);}
  clear(){for(const cache of [this.colors,this.shadows])for(const key of [...cache.keys()])this.retire(cache,key);this.shadowRoot.userData.lodBatches=[];}
  prepare(cache,key,entries,pass,stats){
    const count=entries.reduce((n,e)=>n+e.mesh.count,0),capacity=powerCapacity(count),first=entries[0],source=pass==='shadow'?first.batch.levels.at(-1):first.batch.levels[first.level];
    let g=cache.get(key);
    if(g&&g.capacity!==capacity){this.retire(cache,key);g=null;}
    if(!g){
      const mesh=pass==='shadow'?createAssetShadow([source],capacity,first.batch.group):new THREE.InstancedMesh(geometryView(source.geometry,capacity),source.material,capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled=false;mesh.castShadow=pass==='shadow';mesh.receiveShadow=pass==='color';
      mesh.userData.nativeMergedAsset=true;mesh.userData.nativeMergedPass=pass;
      if(pass==='color')this.root.add(mesh);
      g={mesh,capacity,pass,stamp:null};cache.set(key,g);
    }
    const stamp=(pass==='color'&&this.omitZeroColor?'compact|':'full|')+entries.map(e=>e.batch.uid+':'+e.level+':'+e.mesh.count+':'+e.mesh.instanceMatrix.version+':'+(pass==='color'?(e.mesh.geometry.attributes.nativeVisibility?.version??0):0)+':'+e.group.matrixWorld.elements.join(',')).join('|');
    if(stamp!==g.stamp){
      const matrix=new THREE.Matrix4();let offset=0;
      for(const e of entries)for(let i=0;i<e.mesh.count;i++){
        // Completely faded native trees have a faithful billboard replacement.
        // Keep partial coverage and every shadow caster; omit only zero color.
        if(pass==='color'&&this.omitZeroColor&&(e.mesh.geometry.attributes.nativeVisibility?.array[i]??1)<=0)continue;
        matrix.fromArray(e.mesh.instanceMatrix.array,i*16).premultiply(e.group.matrixWorld);matrix.elements[12]-=this.origin.x;matrix.elements[14]-=this.origin.z;matrix.toArray(g.mesh.instanceMatrix.array,offset*16);
        if(pass==='color')g.mesh.geometry.attributes.nativeVisibility.array[offset]=e.mesh.geometry.attributes.nativeVisibility?.array[i]??1;
        offset++;
      }
      g.mesh.count=offset;g.mesh.instanceMatrix.needsUpdate=true;if(pass==='color')g.mesh.geometry.attributes.nativeVisibility.needsUpdate=true;
      g.mesh.boundingBox=null;g.mesh.boundingSphere=null;g.stamp=stamp;stats.uploads++;
    }
    stats.bytes+=capacity*(pass==='color'?68:64);
    if(pass==='shadow')this.shadowRoot.userData.lodBatches.push({shadow:g.mesh,meshes:[g.mesh]});
  }
  update(chunks,camera,origin={x:0,z:0},light=null){
    if(!this.origin||this.origin.x!==origin.x||this.origin.z!==origin.z){
      this.origin={x:origin.x,z:origin.z};this.root.position.set(origin.x,0,origin.z);
      this.shadowRoot.position.copy(this.root.position);this.shadowRoot.updateMatrixWorld(true);
      for(const cache of [this.colors,this.shadows])for(const group of cache.values())group.stamp=null;
    }
    const stats={colorGroups:0,shadowGroups:0,visibleChunks:0,uploads:0,bytes:0,rawColorSlices:0,shadowChunks:0,culledShadowChunks:0};
    this.stats=stats;this.shadowRoot.userData.lodBatches=[];this.shadowChunks=new Map([['merged',this.shadowRoot]]);
    if(!this.enabled){this.clear();for(const group of chunks.values())for(const b of group.userData.lodBatches??[])for(const m of b.meshes)m.layers.set(0);return stats;}
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
          mesh.layers.set(31);if(!group.visible||!mesh.visible||!mesh.material.visible||!mesh.count)continue;
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
