import {BackSide} from 'three';

// The native mesh and SpatialSurfaceView own the very same vertex buffer.
// Certify topology once per geometry revision, rather than raycasting that
// buffer again at every trajectory/triangle crossing. Unknown geometry keeps
// the ordinary raycast path. Buffer edits must increment attribute.version.
export function createCanonicalTerrainCertificate(){
 const records=new WeakMap();
 return (mesh,source,cx,cz)=>{
  const geometry=mesh?.geometry,p=geometry?.attributes?.position,index=geometry?.index,m=mesh?.material;
  if(!mesh?.isMesh||!mesh.parent||mesh.isSkinnedMesh||mesh.morphTargetInfluences||!geometry?.isBufferGeometry||!m||Array.isArray(m)||m.visible===false||m.side===BackSide||m.positionNode||m.vertexNode||m.displacementMap||m.clippingPlanes?.length||m.transparent||m.opacity!==1||m.alphaTest>0||p?.array!==source||p.itemSize!==3||p.count!==2401||!(source instanceof Float32Array)||!(index?.array instanceof Uint16Array||index?.array instanceof Uint32Array)||index.count!==13824||geometry.drawRange.start!==0||geometry.drawRange.count<index.count)return false;
  for(let node=mesh;node;node=node.parent)if(node.visible===false)return false;
  mesh.updateWorldMatrix(true,false);const matrix=mesh.matrixWorld.elements;
  for(let i=0;i<16;i++)if(matrix[i]!==([0,5,10,15].includes(i)?1:i===12?cx*48:i===14?cz*48:0))return false;
  const prior=records.get(mesh);
  if(prior?.geometry===geometry&&prior.p===p&&prior.source===source&&prior.index===index&&prior.indices===index.array&&prior.pVersion===p.version&&prior.iVersion===index.version)return prior.valid;
  let valid=true;
  for(let z=0;z<49&&valid;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;if(source[i]!==x-24||source[i+2]!==z-24||!Number.isFinite(source[i+1])){valid=false;break;}}
  for(let z=0;z<48&&valid;z++)for(let x=0;x<48;x++){const b=z*49+x,k=(z*48+x)*6,a=index.array;if(a[k]!==b||a[k+1]!==b+49||a[k+2]!==b+1||a[k+3]!==b+1||a[k+4]!==b+49||a[k+5]!==b+50){valid=false;break;}}
  records.set(mesh,{geometry,p,source,index,indices:index.array,pVersion:p.version,iVersion:index.version,valid});return valid;
 };
}
