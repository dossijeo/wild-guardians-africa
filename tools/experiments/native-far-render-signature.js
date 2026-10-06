import {nativeFarGpuRevision} from './prepare-native-far-gpu.js';
// Only resources that can represent this immutable tree species invalidate its GPU proof.
export function nativeFarRenderSignature(world,slot){
 return nativeFarGpuRevision(world.renderer)+':'+world.renderOrigin.revision+'|'+[...world.assetGroups.colors].filter(([key])=>key.startsWith(slot+':')).map(([key,g])=>[key,g.mesh.geometry.uuid,g.mesh.material.uuid,g.mesh.material.version].join(':')).sort().join('|');
}

// A fence may survive unrelated LOD replacement, but never replacement of its
// own source/merged geometry or material, nor an origin/context generation.
export function nativeFarPackingSignature(world,record){
 const source=record.mesh,merged=world.assetGroups.colors.get(record.batch.slot+':'+record.level)?.mesh;
 const resource=mesh=>mesh?[mesh.geometry.uuid,mesh.material.uuid,mesh.material.version].join(':'):'absent';
 return nativeFarGpuRevision(world.renderer)+':'+world.renderOrigin.revision+'|'+resource(source)+'|'+resource(merged);
}
