import * as THREE from 'three';

// Mirror resident and horizon terrain without reparenting live world objects.
// The owner supplies its authoritative streamed meshes.
export function installGroundDepthProxy(world,{prepareWorldDepth=false}={}){
  const pass=world.destructionPass,original=pass.captureDepth,originalPrepare=pass.prepareDepth,scene=new THREE.Scene(),mirrors=new Map();
  const review={enabled:true,meshes:0,fallbacks:0,reason:null};
  function visibleInWorld(source,root){
    for(let node=source;node;node=node.parent){if(!node.visible)return false;if(node===root)return true;}
    return false;
  }
  function update(root){
    const sources=[...world.terrainMeshes,...(world.horizon?.group?.children??[]).filter(o=>o.userData.nativeHorizon==='terrain')],active=new Set();
    // Do not silently change the semantics of future animated/custom terrain.
    review.reason=null;
    if(root.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender&&root.onBeforeRender?.groundDepthSafe!==true||root.onAfterRender!==THREE.Object3D.prototype.onAfterRender&&root.onAfterRender?.groundDepthSafe!==true)review.reason='scene-callback';
    for(const o of sources){
      if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||o.isBatchedMesh||o.morphTargetInfluences){review.reason='mesh-type';break;}
      if(o.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||o.onAfterRender!==THREE.Object3D.prototype.onAfterRender){review.reason='mesh-callback';break;}
      if((Array.isArray(o.material)?o.material:[o.material]).some(m=>m?.onBeforeRender!==THREE.Material.prototype.onBeforeRender)){review.reason='material-callback';break;}
      for(let p=o.parent;p&&p!==root;p=p.parent)if(p.isGroup&&p.renderOrder){review.reason='group-order';break;}
      if(review.reason)break;
    }
    if(review.reason){
      review.fallbacks++;return null;
    }
    scene.onBeforeRender=root.onBeforeRender===THREE.Object3D.prototype.onBeforeRender?THREE.Object3D.prototype.onBeforeRender:(renderer,_scene,camera,target)=>root.onBeforeRender.call(root,renderer,root,camera,target);
    scene.onAfterRender=root.onAfterRender===THREE.Object3D.prototype.onAfterRender?THREE.Object3D.prototype.onAfterRender:(renderer,_scene,camera,target)=>root.onAfterRender.call(root,renderer,root,camera,target);
    scene.fog=root.fog;scene.overrideMaterial=root.overrideMaterial;
    for(const source of sources){
      if(!visibleInWorld(source,root))continue;
      source.updateWorldMatrix(true,false);
      let mirror=mirrors.get(source);
      if(!mirror){mirror=new THREE.Mesh();mirror.matrixAutoUpdate=false;mirror.matrixWorldAutoUpdate=false;mirrors.set(source,mirror);scene.add(mirror);}
      mirror.geometry=source.geometry;mirror.material=source.material;mirror.customDepthMaterial=source.customDepthMaterial;mirror.customWorldDepthMaterial=source.customWorldDepthMaterial;mirror.boundingSphere=source.boundingSphere;
      mirror.matrixWorld.copy(source.matrixWorld);mirror.layers.mask=source.layers.mask;mirror.frustumCulled=source.frustumCulled;mirror.renderOrder=source.renderOrder;
      mirror.visible=true;active.add(source);
    }
    for(const [source,mirror] of mirrors)if(!active.has(source)){scene.remove(mirror);mirrors.delete(source);}
    review.meshes=active.size;
    return scene;
  }
  const capture=function(camera,root){
    if(!review.enabled||world.scene&&root!==world.scene)return original.call(this,camera,root);
    return original.call(this,camera,update(root)??root);
  };
  pass.captureDepth=capture;
  // In the world loading pipeline, compile exactly the target scene that the
  // capture will use. Batched preparation recurses through lightweight views,
  // which must not be mistaken for the world root and redirected again.
  const prepare=function(camera,root,options){
    if(!review.enabled||root!==world.scene)return originalPrepare.call(this,camera,root,options);
    return originalPrepare.call(this,camera,update(root)??root,options);
  };
  if(prepareWorldDepth)pass.prepareDepth=prepare;
  // Submit the same mirrored scene and depth recipes that capture will use.
  // prepareDepth restores all borrowed material/renderer state before awaiting
  // parallel compilation, so loading can continue to present frames.
  review.prepare=(camera,root,options)=>originalPrepare.call(pass,camera,update(root)??root,options);
  review.dispose=()=>{if(pass.captureDepth===capture)pass.captureDepth=original;if(pass.prepareDepth===prepare)pass.prepareDepth=originalPrepare;scene.clear();mirrors.clear();};
  return review;
}
