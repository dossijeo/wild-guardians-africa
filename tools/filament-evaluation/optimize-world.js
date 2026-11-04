import * as THREE from 'three';

/**
 * Batch only rigid, opaque siblings inside each exported chunk. Geometry and
 * material objects are shared by GLTFLoader, so identity grouping preserves
 * the actual primitive and shader. Keeping each batch under its original
 * parent preserves all chunk transforms and the B partial-update sequence.
 * Call once after loading the frozen world GLB, before measuring frames.
 * Do not call on the actor hierarchy (native skeletal instances stay intact).
 */
export function optimizeWorld(root) {
  const before=countWorld(root),batches=[],replaced=[];
  const parents=[];
  root.traverse(node=>{if(node.children.some(child=>child.isMesh))parents.push(node)});
  for(const parent of parents){
    const groups=new Map();
    for(const mesh of [...parent.children]){
      if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||!mesh.visible||mesh.morphTargetInfluences?.length)continue;
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      // InstancedMesh has aggregate visibility and sorting; transparent objects
      // keep individual Three sorting rather than changing the rendered image.
      if(materials.some(material=>material.transparent))continue;
      if(mesh.matrixAutoUpdate)mesh.updateMatrix();
      if(mesh.matrix.determinant()<0)continue;
      const key=[mesh.geometry.uuid,...materials.map(m=>m.uuid),mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask,mesh.frustumCulled].join('|');
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(mesh);
    }
    for(const meshes of groups.values()){
      if(meshes.length<2)continue;
      const first=meshes[0],batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
      batch.name=`batch-${parent.name||parent.uuid}-${first.name||first.geometry.uuid}`;
      batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
      batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;batch.frustumCulled=first.frustumCulled;
      batch.userData.sourceNames=meshes.map(mesh=>mesh.name);
      meshes.forEach((mesh,index)=>{batch.setMatrixAt(index,mesh.matrix);parent.remove(mesh);replaced.push(mesh)});
      batch.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      batch.computeBoundingBox();batch.computeBoundingSphere();parent.add(batch);batches.push(batch);
    }
  }
  const after=countWorld(root);
  if(before.triangles!==after.triangles)throw Error(`Instancing changed triangle count: ${before.triangles} -> ${after.triangles}`);
  return {before,after,batches:batches.length,replacedMeshes:replaced.length,
    culling:'Aggregate per sibling batch within original chunk; no LOD change',
    dispose(){batches.forEach(batch=>batch.dispose())}};
}

function countWorld(root){
  let meshes=0,drawGroups=0,triangles=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.visible)return;
    meshes++;
    const geometry=mesh.geometry,count=Math.min(geometry.index?.count??geometry.attributes.position.count,geometry.drawRange.count);
    triangles+=count/3*(mesh.isInstancedMesh?mesh.count:1);
    drawGroups+=Array.isArray(mesh.material)?Math.max(1,geometry.groups.length):1;
  });
  return {meshes,drawGroups,triangles};
}
