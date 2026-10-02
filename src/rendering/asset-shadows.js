import * as THREE from 'three';

// The original drawBatch(shadow=true) uses the final variant for all active
// instances. Detached proxies enter only Three's shadow traversal, after the
// color render list has been built. Their matrices are immutable on static frames.
export function createAssetShadow(levels,capacity,group){
  const last=levels.at(-1),mesh=new THREE.InstancedMesh(last.geometry,last.material,capacity);
  mesh.count=0;mesh.castShadow=group!==2;mesh.receiveShadow=false;mesh.matrixAutoUpdate=false;
  mesh.onBeforeShadow=(renderer,object,camera,shadowCamera,geometry)=>{
    const stats=mesh.userData.nativeShadowStats;if(!stats)return;
    stats.draws++;stats.triangles+=(geometry.index?.count??geometry.attributes.position.count)/3*mesh.count;
  };
  mesh.userData.nativeShadowCallback=mesh.onBeforeShadow;
  return mesh;
}

export function updateAssetShadow(batch){
  const proxy=batch.shadow;if(!proxy)return;
  let count=0,dirty=false;
  for(const mesh of batch.meshes)for(let i=0;i<mesh.count;i++){
    const src=mesh.instanceMatrix.array,start=i*16,end=count*16;
    for(let j=0;j<16;j++)if(proxy.instanceMatrix.array[end+j]!==src[start+j]){proxy.instanceMatrix.array[end+j]=src[start+j];dirty=true;}
    count++;
  }
  if(count!==proxy.count){proxy.count=count;dirty=true;}
  if(dirty){proxy.instanceMatrix.needsUpdate=true;proxy.boundingBox=null;proxy.boundingSphere=null;}
}

export function disposeAssetShadows(group){for(const batch of group.userData.lodBatches??[])batch.shadow?.dispose();}

export function installAssetShadows(renderer,chunks){
  const map=renderer.shadowMap,original=map.render,proxies=new THREE.Group();proxies.name='native_asset_shadow_pass';proxies.matrixAutoUpdate=false;
  // Native DVS/DFS project solid geometry without atlas alpha or visibility.
  // This shared source material is borrowed only during the shadow traversal.
  const solid=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const stats={draws:0,triangles:0};
  function render(lights,scene,camera){
    // Some diagnostic passes disable shadows. Avoid entering the color render
    // list or allocating/updating GPU resources when no shadow is requested.
    if(!map.enabled||(!map.autoUpdate&&!map.needsUpdate)||!lights.length)return original.call(this,lights,scene,camera);
    stats.draws=stats.triangles=0;
    const materials=new Map();
    try{
      for(const group of chunks().values()){
        if(!group.visible)continue;
        for(const batch of group.userData.lodBatches??[]){
          const mesh=batch.shadow;if(!mesh?.castShadow||!mesh.count||!batch.meshes.some(m=>m.visible&&m.count))continue;
          materials.set(mesh,mesh.material);mesh.material=solid;
          mesh.userData.nativeShadowStats=stats;
          mesh.matrix.copy(group.matrixWorld);proxies.add(mesh);
        }
      }
      proxies.matrix.copy(scene.matrixWorld).invert();scene.add(proxies);proxies.updateMatrixWorld(true);
      return original.call(this,lights,scene,camera);
    }finally{for(const [mesh,material] of materials){mesh.material=material;delete mesh.userData.nativeShadowStats;}scene.remove(proxies);proxies.clear();}
  }
  map.render=render;
  let released=false;
  const release=()=>{if(released)return;released=true;if(map.render===render)map.render=original;proxies.removeFromParent();proxies.clear();solid.dispose();};
  release.stats=stats;return release;
}
