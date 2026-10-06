import * as THREE from 'three';

// QA geometry candidates, not GPU fragment ownership. Raycasting does not run
// alpha/discard recipes, shader displacement or procedural morphs.
export function depthPixelCandidates(scene,camera,width,height,pixels,{limit=8,recipe=()=>null}={}){
 if(!(width>0&&height>0)||!Number.isInteger(limit)||limit<1||limit>16||pixels.length>8)throw Error('Invalid bounded pixel query');
 const targets=[];scene.traverseVisible(object=>{
  if(!object.isMesh||(object.isInstancedMesh&&object.count===0))return;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  if(materials.some(m=>m?.visible&&m.depthWrite&&!m.transparent))targets.push(object);
 });
 const ray=new THREE.Raycaster(),seen=new Set(),rows=[];
 for(const {x,y} of pixels){
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=width||y>=height)throw Error('Pixel outside framebuffer');
  const key=x+','+y;if(seen.has(key))continue;seen.add(key);
  ray.setFromCamera(new THREE.Vector2(2*(x+.5)/width-1,2*(y+.5)/height-1),camera);
  const hits=ray.intersectObjects(targets,false).filter(hit=>{
   const depth=hit.point.clone().project(camera).z;if(depth < -1 || depth > 1)return false;
   const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;
   return material?.visible&&material.depthWrite&&!material.transparent;
  }).slice(0,limit);
  rows.push({x,y,candidates:hits.map(hit=>{
   const object=hit.object,material=Array.isArray(object.material)?object.material[hit.face?.materialIndex??0]:object.material;
   let owner=object;while(owner&&!owner.userData.entityId)owner=owner.parent;
   return {object:object.uuid,name:object.name,entityId:owner?.userData.entityId??null,
    propSlot:object.userData.nativePropSlot??null,instance:hit.instanceId??null,
    geometry:object.geometry.uuid,face:hit.faceIndex,distance:hit.distance,point:hit.point.toArray(),uv:hit.uv?.toArray()??null,
    material:material.id,type:material.type,alphaTest:material.alphaTest,map:material.map?.uuid??null,
    surface:material.userData.nativeSurface?.params?.slice()??null,
    features:[...(recipe(material)?.features??[])]};
  })});
 }
 return {scope:'CPU intersections only; alpha, discard and shader displacement are not evaluated. Candidates do not prove fragment ownership.',rows};
}
