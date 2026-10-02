import * as THREE from 'three';
import {nativeLodBins} from './lod-source.js';
import {obstructionGeometry,obstructionMaterial} from './obstruction.js';

// Stable logical instances own coverage; render bins only borrow it. Navigation,
// contact AO and water continue using the full, unmodified instance population.
export function createAssetLod(group,levels,instances,asset,slot){
  const bounds=levels[0].geometry.boundingBox;
  const prototype={...asset,size:bounds.getSize(new THREE.Vector3()).toArray(),centerY:(bounds.min.y+bounds.max.y)/2};
  const batch={instances,prototype,group:asset.group,meshes:[],orders:[],key:null,fade:null};
  for(const [level,original] of levels.entries()){
    const geometry=obstructionGeometry(original.geometry,instances,asset,slot,levels[0].geometry);
    obstructionMaterial(original.material);
    const mesh=new THREE.InstancedMesh(geometry,original.material,instances.length);
    mesh.count=0;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.nativeLodBatch=batch;mesh.userData.nativeLodLevel=level;
    if(geometry.userData.obstruction&&!batch.fade){const f=geometry.userData.obstruction;batch.fade={records:f.records,attribute:new THREE.InstancedBufferAttribute(new Float32Array(instances.length).fill(1),1),fresh:true};}
    group.add(mesh);batch.meshes.push(mesh);batch.orders.push([]);
  }
  batch.packCoverage=()=>packLodCoverage(batch);
  (group.userData.lodBatches??=[]).push(batch);return batch;
}

export function packLodCoverage(batch){
  if(!batch.fade)return;
  for(const [level,mesh] of batch.meshes.entries()){
    const attribute=mesh.geometry.userData.obstruction.attribute;let dirty=false;
    for(const [j,i] of batch.orders[level].entries()){const value=batch.fade.attribute.array[i];if(attribute.array[j]!==value){attribute.array[j]=value;dirty=true;}}
    if(dirty)attribute.needsUpdate=true;
  }
}

export function updateAssetLods(chunks,camera,quality){
  const eye=camera.position.toArray(),key=eye.map(v=>Math.round(v/1.5)).join(',')+':'+quality;
  const stats={counts:[0,0,0],culled:0,updates:0,triangles:0,fullTriangles:0};
  let dummy;
  for(const group of chunks.values())for(const batch of group.userData.lodBatches??[]){
    if(batch.key!==key){
      const bins=nativeLodBins(batch.instances,batch.prototype,batch.group,eye,quality,batch.meshes.length);
      for(const [level,mesh] of batch.meshes.entries()){
        const order=bins[level],old=batch.orders[level];
        if(order.length!==old.length||order.some((i,j)=>i!==old[j])){
          dummy??=new THREE.Object3D();
          for(const [j,i] of order.entries()){const p=batch.instances[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.yaw;dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);}
          mesh.count=order.length;mesh.instanceMatrix.needsUpdate=true;mesh.boundingBox=null;mesh.boundingSphere=null;batch.orders[level]=order;stats.updates++;
        }
      }
      packLodCoverage(batch);batch.key=key;
    }
    let active=0;for(const [level,mesh] of batch.meshes.entries()){stats.counts[level]+=mesh.count;active+=mesh.count;stats.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;}stats.culled+=batch.instances.length-active;
    const full=batch.meshes[0].geometry;stats.fullTriangles+=(full.index?.count??full.attributes.position.count)/3*batch.instances.length;
  }
  return stats;
}
