// QA-only art study. A fan coordinate follows the authored pond outline;
// it is NOT physical depth. No geometry positions or simulation are changed.
export function applyPondBankGradient(world){
 const changed=[],geometries=new Map(),materials=new Map();
 world.scene.traverse(mesh=>{
  const source=mesh.material,p=mesh.geometry?.attributes.position;
  if(!mesh.isMesh||!source?.userData.paintUniforms||!p||mesh.geometry.index||p.count<12)return;
  const sameCenter=Array.from({length:p.count/3},(_,i)=>i*3).every(i=>Math.abs(p.getX(i)-p.getX(0))+Math.abs(p.getY(i)-p.getY(0))+Math.abs(p.getZ(i)-p.getZ(0))<1e-6);
  if(!sameCenter)return;
  let geometry=geometries.get(mesh.geometry);
  if(!geometry){geometry=mesh.geometry.clone();const coordinate=new Float32Array(p.count);for(let i=0;i<p.count;i+=3)coordinate[i]=1;geometry.setAttribute('labPondInterior',new p.constructor(coordinate,1));geometries.set(mesh.geometry,geometry);}
  mesh.geometry=geometry;
  let material=materials.get(source);
  if(!material){
   material=source.clone();material.userData.paintUniforms=source.userData.paintUniforms;
   const compile=source.onBeforeCompile;
   material.onBeforeCompile=(shader,renderer)=>{
    compile(shader,renderer);
    shader.vertexShader='attribute float labPondInterior;varying float vLabPondInterior;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLabPondInterior=labPondInterior;');
    shader.fragmentShader='varying float vLabPondInterior;\n'+shader.fragmentShader;
    const before='vec3 base=mix(uInk1,paint,.42)*.72;';
    if(!shader.fragmentShader.includes(before))throw Error('Pond base shader anchor missing');
    shader.fragmentShader=shader.fragmentShader.replace(before,'vec3 deepPaint=mix(uInk1,paint,.42);vec3 shallowPaint=mix(deepPaint,vec3(.30,.48,.34),.65);vec3 base=mix(shallowPaint,deepPaint,smoothstep(0.,.40,vLabPondInterior))*.72;');
   };
   material.customProgramCacheKey=()=>source.customProgramCacheKey()+'|qa-pond-bank-gradient';material.needsUpdate=true;materials.set(source,material);
  }
  mesh.material=material;world.materialRegistry.refresh(mesh);changed.push({name:mesh.name,vertices:p.count,instances:mesh.count??1,coordinateBytes:p.count*4});
 });
 if(!changed.length)throw Error('No authored pond fans found');
 return {changed,uniqueGeometries:geometries.size,uniqueMaterials:materials.size};
}
