import * as THREE from 'three';
export function waterOpaqueCoreEnabled(biome,search=globalThis.location?.search??''){const q=new URLSearchParams(search);return biome==='gran-canon'&&q.get('visualLab')==='global-lighting'&&q.get('waterEdges')==='natural'&&q.get('waterCore')==='opaque';}
// Opt-in Canyon: opaque interior depth precedes terrain; transparent shore remains exact.
export function prepareOpaqueCore(mesh){
 const shore=mesh.material;if(!shore.transparent||mesh.isInstancedMesh||mesh.userData.waterCore)return;
 const compile=shore.onBeforeCompile,key=shore.customProgramCacheKey();
 const core=shore.clone();core.userData.paintUniforms=shore.userData.paintUniforms;
 function patch(shader,renderer,opaque){
  compile.call(shore,shader,renderer);
  const start=shader.fragmentShader.indexOf('vec2 qaUV=');
  const end=shader.fragmentShader.indexOf('#include <opaque_fragment>',start);
  if(start<0||end<0)throw Error('Core bank opacity block missing');
  const block=shader.fragmentShader.slice(start,end);
  shader.fragmentShader=shader.fragmentShader.slice(0,start)+shader.fragmentShader.slice(end);
  const anchor='float fluidVisibility=1.;';if(!shader.fragmentShader.includes(anchor))throw Error('Core bank lighting anchor missing');
  shader.fragmentShader=shader.fragmentShader.replace(anchor,block+(opaque?'if(diffuseColor.a<1.)discard;':'if(diffuseColor.a>=1.||diffuseColor.a<=0.)discard;')+'\n'+anchor);
 }
 core.transparent=false;core.depthWrite=true;core.onBeforeCompile=(s,r)=>patch(s,r,true);core.customProgramCacheKey=()=>key+'|opaque-core';
 shore.onBeforeCompile=(s,r)=>patch(s,r,false);shore.customProgramCacheKey=()=>key+'|transparent-rim';shore.needsUpdate=true;
 const interior=new THREE.Mesh(mesh.geometry,core);interior.position.copy(mesh.position);interior.rotation.copy(mesh.rotation);interior.scale.copy(mesh.scale);interior.receiveShadow=mesh.receiveShadow;interior.renderOrder=-1;interior.name='water-opaque-interior';interior.userData.borrowedWaterGeometry=true;mesh.userData.waterCore=interior;
 mesh.parent.add(interior);
}
