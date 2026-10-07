import * as THREE from 'three';
import {obstructionMaterial} from '../../src/rendering/obstruction.js';
import {surfaceMapBias,surfaceMapFragment} from '../../src/rendering/surface-alpha.js';
// Diagnostic only: same geometry/map/alpha/culling/fade, without native lighting.
// This is not a visual replacement and cannot establish native shader readiness.
export function createStandbyMaterialProbe(){
 const records=new Map();let disposed=false;
 function restore(mesh,record){mesh.material=record.source;record.probe.dispose();records.delete(mesh);}
 function update(adapters,mode='native'){
  if(disposed)throw Error('Disposed standby material probe');
  if(!['native','basic'].includes(mode))throw Error('Invalid standby material probe');
  const meshes=new Set(adapters.flatMap(a=>a.standbyDraws().map(d=>d.mesh)));
  for(const [mesh,record]of records)if(mode==='native'||!meshes.has(mesh))restore(mesh,record);
  if(mode==='native')return;
  for(const mesh of meshes){
   if(records.has(mesh))continue;const source=mesh.material;
   if(Array.isArray(source))throw Error('QA basic probe requires a single material');
   const probe=new THREE.MeshBasicMaterial({map:source.map,alphaMap:source.alphaMap,alphaTest:source.alphaTest,opacity:source.opacity,side:source.side,vertexColors:source.vertexColors,fog:source.fog,toneMapped:source.toneMapped,color:source.color});
   for(const name of ['alphaToCoverage','alphaHash','transparent','depthTest','depthWrite','colorWrite','polygonOffset','polygonOffsetFactor','polygonOffsetUnits'])probe[name]=source[name];
   probe.name='QA-standby-basic';probe.clippingPlanes=source.clippingPlanes;probe.clipIntersection=source.clipIntersection;probe.clipShadows=source.clipShadows;
   probe.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',surfaceMapFragment(source.userData.nativeSurface));};
   probe.customProgramCacheKey=()=> 'QA-standby-basic-v1|map-bias='+surfaceMapBias(source.userData.nativeSurface);
   obstructionMaterial(probe);records.set(mesh,{source,probe});mesh.material=probe;
  }
 }
 return {update,get size(){return records.size;},dispose(){if(disposed)return;for(const [mesh,record]of records)restore(mesh,record);disposed=true;}};
}
