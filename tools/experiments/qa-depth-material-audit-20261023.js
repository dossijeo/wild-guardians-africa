// Read-only classification inside the existing transactional depth preparation.
import {withDepthCaptureMaterials} from '/src/rendering/depth-capture.js';
export function auditDepthMaterials(world){
 const source=new Map();world.scene.traverseVisible(o=>{if(o.material)source.set(o,o.material);});
 const rows=[];
 const stats=withDepthCaptureMaterials(world.scene,()=>{for(const [o,m]of source){const list=Array.isArray(m)?m:[m];rows.push({name:o.name,type:o.type,instanced:!!o.geometry?.isInstancedBufferGeometry,instances:o.geometry?.instanceCount??o.count??null,ground:!!(o.userData.ground||list.some(x=>x.userData.biomeGround)),mud:!!o.userData.globalMudBlend,coverage:!!o.geometry?.attributes.coverageAnchor,specialized:o.material!==m,renderMaterial:Array.isArray(o.material)?o.material.map(x=>x.type):o.material.type,depthCompatible:!!o.customDepthMaterial?.userData.worldDepthCompatible,depthWrite:list.map(x=>x.depthWrite),transparent:list.map(x=>x.transparent)});}},world.destructionPass.depthCaptureOptions());
 for(const [o,m]of source)if(o.material!==m)throw Error('Depth audit did not restore material');
 return {stats,rows};
}
