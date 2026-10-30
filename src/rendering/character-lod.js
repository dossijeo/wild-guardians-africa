import {Box3,Vector3,Skeleton} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Screen-space thresholds account for orthographic zoom and display resolution.
// Hysteresis prevents flicker near the transition. Canonical skin stays available
// to picking, contact sampling and physics; only draw visibility changes.
export const CHARACTER_LOD={enterPixels:65,exitPixels:82};
const point=new Vector3(),worldScale=new Vector3();
export function projectedCharacterPixels(camera,height,position,viewportHeight){
 if(camera.isOrthographicCamera)return height*viewportHeight*camera.zoom/(camera.top-camera.bottom);
 const depth=Math.max(.01,point.copy(position).applyMatrix4(camera.matrixWorldInverse).z*-1);
 return height*viewportHeight*camera.projectionMatrix.elements[5]/(2*depth);
}
export class CharacterLod {
 constructor(original,template,{height,materialFactory,prepareRoot}={}){
  this.original=original;this.root=clone(template);this.root.name='CharacterLOD';this.low=false;this.links=[];this.draws=[];this.skeletons=new Set();this.materials=[];
  original.updateMatrixWorld(true);this.height=height??new Box3().setFromObject(original).getSize(new Vector3()).y;this.initialScale=Math.max(1e-8,Math.abs(original.getWorldScale(worldScale).y));
  const bones=new Map(),nodes=new Map();original.traverse(o=>{nodes.set(o.name,o);if(o.isBone)bones.set(o.name,o);if(o.isMesh)this.draws.push({mesh:o,visible:o.visible});});
  const oldSkeletons=new Set();
  this.root.traverse(o=>{
   const source=nodes.get(o.name);if(source)this.links.push({node:o,source});
   if(!o.isMesh)return;
   if(o.isSkinnedMesh){oldSkeletons.add(o.skeleton);const bound=o.skeleton.bones.map(b=>{const bone=bones.get(b.name);if(!bone)throw Error('LOD missing original bone '+b.name);return bone;});const skeleton=new Skeleton(bound,o.skeleton.boneInverses.map(m=>m.clone()));o.bind(skeleton,o.bindMatrix);this.skeletons.add(skeleton);}
   const ao=o.geometry.getAttribute('_ambient_visibility');if(ao)o.geometry.setAttribute('ambientVisibility',ao);
   const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{
    const copy=materialFactory?materialFactory(m):m.clone();
    if(ao)copy.userData.modelAmbientVisibility={value:1};
    this.materials.push(copy);return copy;
   });o.material=materials.length===1?materials[0]:materials;
   o.castShadow=source?.castShadow??true;o.receiveShadow=true;o.frustumCulled=false;
  });
  for(const s of oldSkeletons)s.dispose();this.root.visible=false;prepareRoot?.(this.root);original.parent.add(this.root);
 }
 beforePose(){if(this.low)for(const d of this.draws)d.mesh.visible=d.visible;}
 update(camera,viewportHeight,force=null){
  const original=this.original;
  this.root.position.copy(original.position);this.root.quaternion.copy(original.quaternion);this.root.scale.copy(original.scale);
  const pixels=projectedCharacterPixels(camera,this.height*Math.abs(original.getWorldScale(worldScale).y)/this.initialScale,original.getWorldPosition(point),viewportHeight);
  const low=force??(this.low?pixels<CHARACTER_LOD.exitPixels:pixels<CHARACTER_LOD.enterPixels);
  // Transform controllers (tools, recovery carrier) remain authoritative.
  if(low)for(const {node,source} of this.links){node.position.copy(source.position);node.quaternion.copy(source.quaternion);node.scale.copy(source.scale);node.visible=source.visible;}
  for(const d of this.draws){d.visible=d.mesh.visible;if(low)d.mesh.visible=false;}
  this.low=low;this.pixels=pixels;this.root.visible=low&&original.visible;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.beforePose();this.root.removeFromParent();for(const s of this.skeletons)s.dispose();for(const m of this.materials)m.dispose();}
}

export async function attachCharacterLod(world,data,id){
 const asset=await world.assets.model('/content/character-lod/'+id+'.glb');
 if(world.disposed||!data.model.parent||data.lod||![...world.mixers.values()].includes(data))return;
 const lod=new CharacterLod(data.model,asset.scene,{prepareRoot:root=>root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!data.profile){m.userData.beastSurface=true;m.userData.furLightingMask=id==='buffalo'&&!!o.geometry.getAttribute('_fur_light');if(id==='warthog')m.userData.warthogSurface=true;}if(id==='olderMale'&&m.name==='BakedMaterial'){m.userData.matteWorkerBody=true;m.roughness=.88;m.metalness=0;}}})});
 data.lod=lod;
}
