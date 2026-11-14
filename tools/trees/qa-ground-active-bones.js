// QA-only. Sample lists and skin buffers are assumed immutable except for
// versioned Three.js attribute updates; not yet suitable for production.
const perRig=new WeakMap();
export function groundBones(data,mesh){
 if(!globalThis.__qaSparseBonesEnabled)return null;
 const attr=mesh.geometry.attributes,index=attr.skinIndex,weight=attr.skinWeight,stats=globalThis.__qaSparseBoneStats??={builds:0,binds:0,used:0,total:0};
 if(!index||!weight)return null;let byMesh=perRig.get(data);if(!byMesh){byMesh=new WeakMap();perRig.set(data,byMesh);}let entry=byMesh.get(mesh);
 if(!entry||entry.samples!==data.groundSamples||entry.index!==index||entry.weight!==weight||entry.indexVersion!==index.version||entry.weightVersion!==weight.version||entry.boneCount!==mesh.skeleton.bones.length){const active=new Set();for(const sample of data.groundSamples)if(sample.mesh===mesh)for(let i=0;i<4;i++)if(weight.getComponent(sample.index,i)!==0)active.add(index.getComponent(sample.index,i));entry={samples:data.groundSamples,index,weight,indexVersion:index.version,weightVersion:weight.version,boneCount:mesh.skeleton.bones.length,active:[...active].sort((a,b)=>a-b)};byMesh.set(mesh,entry);stats.builds++;}
 stats.binds++;stats.used+=entry.active.length;stats.total+=entry.boneCount;return entry.active;
}
