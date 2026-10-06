import {nativeFarGpuRevision} from './prepare-native-far-gpu.js';
// Only resources that can represent this immutable tree species invalidate its GPU proof.
export function nativeFarRenderSignature(world,slot){
 return nativeFarGpuRevision(world.renderer)+':'+world.renderOrigin.revision+'|'+[...world.assetGroups.colors].filter(([key])=>key.startsWith(slot+':')).map(([key,g])=>[key,g.mesh.geometry.uuid,g.mesh.material.uuid,g.mesh.material.version].join(':')).sort().join('|');
}
