import {Quaternion,Raycaster,Vector3} from 'three';

// Experimental visual-only support. Points are baked in bone-local space;
// one low point per horizontal cell drives at most 16 terrain raycasts.
// This is an approximation, not a certificate for terrain or body contacts.
export function createAnatomicSupport({model,root,residency,bank,radius}={}){
 if(!model?.isObject3D||!root?.isObject3D||typeof residency?.get!=='function'||!Array.isArray(bank?.bones)||!(radius>0))throw TypeError('Invalid anatomical support');
 const bones=new Map(),entries=[];model.traverse(o=>{if(o.isBone)bones.set(o.name.replace(/^mixamorig[:_]?/,''),o);});
 for(const item of bank.bones){const bone=bones.get(item.name);if(!bone||!Array.isArray(item.points)||item.points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))throw Error('Anatomical support rig mismatch');entries.push({bone,points:item.points.map(p=>new Vector3().fromArray(p))});}
 if(!entries.length)throw Error('Empty anatomical support');const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0),point=new Vector3(),center=new Vector3(),cells=Array(16).fill(null),extent=Math.max(2,radius*2);
 return {apply(){root.updateMatrixWorld(true);root.getWorldPosition(center);cells.fill(null);for(const entry of entries)for(const local of entry.points){point.copy(local).applyMatrix4(entry.bone.matrixWorld);const x=Math.max(0,Math.min(3,Math.floor((point.x-center.x+extent)*2/extent))),z=Math.max(0,Math.min(3,Math.floor((point.z-center.z+extent)*2/extent))),index=z*4+x,old=cells[index];if(!old||point.y<old.y)cells[index]=point.clone();}
  let lift=0,queries=0;for(const p of cells){if(!p)continue;const terrain=residency.get(Math.floor((p.x+24)/48),Math.floor((p.z+24)/48));if(!terrain)continue;terrain.updateWorldMatrix(true,false);ray.set(origin.set(p.x,1000,p.z),down);const y=ray.intersectObject(terrain,false)[0]?.point.y;queries++;if(Number.isFinite(y))lift=Math.max(lift,y+.06-p.y);}
  if(lift>0){const delta=new Vector3(0,lift,0).applyQuaternion(root.getWorldQuaternion(new Quaternion()).invert());delta.divide(root.getWorldScale(new Vector3()));model.position.add(delta);root.updateMatrixWorld(true);}return {lift,queries};}};
}
