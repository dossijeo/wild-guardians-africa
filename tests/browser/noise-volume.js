import * as THREE from 'three';

// Experimental QA adapter only. Does not enter the production import graph.
// Eight corners are sampled by hardware trilinear interpolation, with the same
// smooth interpolation curve. Quantization and a finite period change the noise
// realization; this is deliberately not advertised as a pixel-identical recipe.
const fract=x=>x-Math.floor(x);
export function cornerNoise(x,y,z){
 const p=[x,y,z].map(v=>fract(v*.1031));
 const dot=p[0]*(p[1]+33.33)+p[1]*(p[2]+33.33)+p[2]*(p[0]+33.33);
 return fract((p[0]+dot+p[1]+dot)*(p[2]+dot));
}

export function volumeNoiseSource(source){
 const calls=['materialNoise(worldP*.85)','materialNoise(worldP*2.2)','materialNoise(worldPatternPosition(worldP)*2.6)'];
 if(!calls.some(call=>source.includes(call)))return source;
 const marker='vec3 toLinear4(vec3 c)';
 if(!source.includes(marker))throw Error('Fine-noise volume requires authored color helper');
 for(const call of calls)source=source.replaceAll(call,call.replace('materialNoise','volumeFineNoise'));
 const helper=`uniform highp sampler3D uFineNoiseVolume;
 uniform float uFineNoiseVolumeEnabled;
 float volumeFineNoise(vec3 p){
  if(uFineNoiseVolumeEnabled<.5)return materialNoise(p);
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return texture(uFineNoiseVolume,(mod(i,64.)+f+.5)/64.).r;
 }
 `;
 return source.replace(marker,helper+marker);
}

export class FineNoiseVolume{
 constructor(){
  const data=new Uint8Array(64**3);
  for(let z=0;z<64;z++)for(let y=0;y<64;y++)for(let x=0;x<64;x++)data[x+64*(y+64*z)]=Math.round(cornerNoise(x,y,z)*255);
  this.texture=new THREE.Data3DTexture(data,64,64,64);this.texture.format=THREE.RedFormat;
  this.texture.type=THREE.UnsignedByteType;this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;
  this.texture.wrapS=this.texture.wrapT=this.texture.wrapR=THREE.RepeatWrapping;
  this.texture.generateMipmaps=false;this.texture.unpackAlignment=1;this.texture.needsUpdate=true;
  this.uniforms={uFineNoiseVolume:{value:this.texture},uFineNoiseVolumeEnabled:{value:0}};
  this.materials=new WeakSet();this.patched=0;this.disposed=false;
 }
 apply(root){
  root.traverse(o=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(this.materials.has(material)||material.transparent||material.userData.paintUniforms)continue;
   this.materials.add(material);
   const original=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
   material.onBeforeCompile=(shader,renderer)=>{
    original.call(material,shader,renderer);const adapted=volumeNoiseSource(shader.fragmentShader);
    if(adapted!==shader.fragmentShader){shader.fragmentShader=adapted;Object.assign(shader.uniforms,this.uniforms);this.patched++;}
   };
   material.customProgramCacheKey=()=>key()+'|qa-fine-volume-64-r8';material.needsUpdate=true;
  }});
 }
 dispose(){if(!this.disposed){this.disposed=true;this.texture.dispose();}}
}
