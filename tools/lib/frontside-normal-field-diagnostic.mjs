// QA-only later normal readback. Original PBR captures/gates remain unchanged.
// Vertex hook and material maps are retained; fragment output is diagnostic.
import * as THREE from 'three';
export function captureNormalField(renderer,rig,camera,size,kind){
 if(!['vertex','direction','oriented','perturbed'].includes(kind))throw Error('Unknown normal diagnostic');
 const saved=[];let shadow=renderer.shadowMap.enabled,color=renderer.outputColorSpace;
 try{
  rig.model.traverse(mesh=>{if(!mesh.isMesh)return;if(Array.isArray(mesh.material))throw Error('Normal diagnostic expects single materials');
   const original=mesh.material,material=original.clone(),compile=original.onBeforeCompile;
   material.onBeforeCompile=(shader,r)=>{compile.call(original,shader,r);const expression=kind==='vertex'?'vNormal':kind==='direction'?'normalize(vNormal)':kind==='oriented'?'normalize(vNormal)*(gl_FrontFacing?1.:-1.)':'normal';
    if(kind!=='perturbed'&&material.flatShading)throw Error('No vertex normal varying on flat shading');
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

export function normalFieldByteStatistics(pixels,scope){
 const sums=[0,0,0],min=[255,255,255],max=[0,0,0];let count=0,allZero=0;
 for(let i=0;i<pixels.length;i+=4){if(!scope[i+3])continue;count++;if(pixels[i]===0&&pixels[i+1]===0&&pixels[i+2]===0)allZero++;
  for(let c=0;c<3;c++){sums[c]+=pixels[i+c];min[c]=Math.min(min[c],pixels[i+c]);max[c]=Math.max(max[c],pixels[i+c]);}}
 return {pixels:count,allZeroEncodedPixels:allZero,minChannelBytes:min,maxChannelBytes:max,meanChannelBytes:sums.map(x=>x/Math.max(count,1)),meaning:'Encoded readback only; zero bytes do not prove NaN or a particular undefined shader normalization result'};
}
