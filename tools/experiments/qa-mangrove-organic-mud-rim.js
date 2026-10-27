import * as THREE from 'three';
// QA: erode only the displayed rim. Authoritative mud outlines stay intact.
export function applyMaterialStudy(world){
 if(world.state.biome!=='manglares')throw Error('Mangrove only');
 const bindings=[],start=performance.now();let bytes=0,vertices=0;
 function bind(mesh,cx,cz){
  if(!mesh||mesh.userData.qaMudRim)return mesh;mesh.userData.qaMudRim=true;
  const geometry=mesh.geometry,p=geometry.attributes.position,outlines=geometry.userData.mudOutlines,edge=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i)+cx*48,z=p.getZ(i)+cz*48;let distance=Infinity;
   for(const contour of outlines)for(let j=0;j<contour.length;j++){
    const a=contour[j],b=contour[(j+1)%contour.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
   }edge[i]=distance;
  }
  geometry.setAttribute('qaMudEdge',new THREE.BufferAttribute(edge,1));vertices+=p.count;bytes+=edge.byteLength;
  const material=mesh.material,compile=material.onBeforeCompile,key=material.customProgramCacheKey;
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
   shader.vertexShader='attribute float qaMudEdge;varying float vQAMudEdge;varying vec2 vQAMudXZ;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvQAMudEdge=qaMudEdge;vQAMudXZ=position.xz+vec2(${(cx*48).toFixed(1)},${(cz*48).toFixed(1)});`);
   shader.fragmentShader=`varying float vQAMudEdge;varying vec2 vQAMudXZ;
float qaMudHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float qaMudNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(qaMudHash(i),qaMudHash(i+vec2(1.,0.)),f.x),mix(qaMudHash(i+vec2(0.,1.)),qaMudHash(i+vec2(1.,1.)),f.x),f.y);}
`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(vQAMudEdge<.04+.34*qaMudNoise(vQAMudXZ*2.2)+.10*qaMudNoise(vQAMudXZ*8.))discard;`);
  };
  material.customProgramCacheKey=()=>key.call(material)+'|qa-mud-organic-rim|'+cx+','+cz;material.needsUpdate=true;bindings.push({mesh,compile,key});return mesh;
 }
 for(const [key,group]of world.chunks){const [cx,cz]=key.split(',').map(Number);group.traverse(m=>{if(m.name==='mangrove-mud-patches')bind(m,cx,cz)})}
 const original=world.mudPatches.chunk;world.mudPatches.chunk=function(field,cx,cz){return bind(original.call(this,field,cx,cz),cx,cz)};
 const audit=()=>({meshes:bindings.length,vertices,attributeBytes:bytes,elapsedSinceInstallMs:performance.now()-start,newTriangles:0,newDrawCalls:0,newTextures:0,authoritativeOutlinesChanged:false});
 world.qaMudRim={audit,dispose(){world.mudPatches.chunk=original;for(const {mesh,compile,key}of bindings){mesh.geometry.deleteAttribute('qaMudEdge');mesh.material.onBeforeCompile=compile;mesh.material.customProgramCacheKey=key;mesh.material.needsUpdate=true;delete mesh.userData.qaMudRim}}};return audit();
}
