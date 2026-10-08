// QA-only later normal readback. Original PBR captures/gates remain unchanged.
// Vertex hook and material maps are retained; fragment output is diagnostic.
import * as THREE from 'three';
export function captureNormalField(renderer,rig,camera,size,kind){
 if(!['vertex','perturbed'].includes(kind))throw Error('Unknown normal diagnostic');
 const saved=[];let shadow=renderer.shadowMap.enabled,color=renderer.outputColorSpace;
 try{
  rig.model.traverse(mesh=>{if(!mesh.isMesh)return;if(Array.isArray(mesh.material))throw Error('Normal diagnostic expects single materials');
   const original=mesh.material,material=original.clone(),compile=original.onBeforeCompile;
   material.onBeforeCompile=(shader,r)=>{compile.call(original,shader,r);const expression=kind==='vertex'?'vNormal':'normal';
    if(kind==='vertex'&&material.flatShading)throw Error('No vertex normal varying on flat shading');
    const end=shader.fragmentShader.lastIndexOf('}');if(end<0)throw Error('Fragment entry closure missing');
    shader.fragmentShader=shader.fragmentShader.slice(0,end)+`\n gl_FragColor=vec4(clamp(${expression}*.5+.5,0.,1.),1.);\n`+shader.fragmentShader.slice(end);
   };
   material.customProgramCacheKey=()=>original.customProgramCacheKey()+'|qa-normal-field-'+kind;material.toneMapped=false;
   mesh.material=material;saved.push({mesh,original,material});
  });
  renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.render(rig.scene,camera);
  const gl=renderer.getContext(),pixels=new Uint8Array(size*size*4);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;
 }finally{renderer.shadowMap.enabled=shadow;renderer.outputColorSpace=color;for(const {mesh,original,material} of saved){mesh.material=original;material.dispose();}}
}
export function normalFieldMetrics(a,b,alpha,size){
 let occupied=0,changed=0,max=0,sum=0;const mask=new Uint8Array(size*size);
 for(let i=0;i<a.length;i+=4){if(!alpha[i+3])continue;occupied++;let differs=false;
  for(let c=0;c<3;c++){const delta=Math.abs(a[i+c]-b[i+c]);sum+=delta;max=Math.max(max,delta);differs||=delta>0;}if(differs){changed++;mask[i/4]=1;}}
 return {occupiedPixels:occupied,changedPixels:changed,maxChannelByteDelta:max,meanChannelByteDelta:sum/Math.max(occupied*3,1),mask};
}
