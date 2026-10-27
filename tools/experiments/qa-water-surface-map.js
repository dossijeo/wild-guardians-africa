import * as THREE from 'three';
import {applyMaterialStudy as applyLean} from './qa-water-surface-lean.js';
const fract=x=>x-Math.floor(x),wrap=x=>(x%32+32)%32;
function hash(x,y){let a=fract(wrap(x)*.1031),b=fract(wrap(y)*.1030),c=fract(wrap(x)*.0973);const d=a*(b+19.19)+b*(c+19.19)+c*(a+19.19);a+=d;b+=d;c+=d;return fract((a+b)*c)}
function makeSlopeTexture(){
 const size=256,data=new Uint8Array(size*size*2);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=(x+.5)/size*32,py=(y+.5)/size*32,ix=Math.floor(px),iy=Math.floor(py),fx=fract(px),fy=fract(py),ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1),mixed=a-b-c+d;
  const sx=6*fx*(1-fx)*(b-a+mixed*uy),sy=6*fy*(1-fy)*(c-a+mixed*ux),at=(y*size+x)*2;
  data[at]=Math.round((sx/3+.5)*255);data[at+1]=Math.round((sy/3+.5)*255);
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function applyMaterialStudy(world){
 const start=performance.now(),audit=applyLean(world),texture=world.assets.own(makeSlopeTexture());
 const materials=new Set();world.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.paintUniforms&&o.material.userData.paintUniforms.uSurfaceLava.value<.5)materials.add(o.material)});
 for(const m of materials){const compile=m.onBeforeCompile,key=m.customProgramCacheKey.bind(m);m.onBeforeCompile=(shader,renderer)=>{
  compile(shader,renderer);shader.uniforms.uQaWaterSlope={value:texture};shader.fragmentShader='uniform sampler2D uQaWaterSlope;\n'+shader.fragmentShader.replace(/vec2 qaWaterSlope\(vec2 p\)\{[^}]+\}/,'vec2 qaWaterSlope(vec2 p){return texture2D(uQaWaterSlope,p/32.).rg*3.-1.5;}');
 };m.customProgramCacheKey=()=>key()+'|slope-map';m.needsUpdate=true;}
 return {...audit,newTextures:1,textureBytes:131072,estimatedBytesWithMipmaps:174764,setupMs:performance.now()-start,note:'Procedural numerical slope data; no external image or asset. 32-cell periodic field, two scrolling samples.'};
}
