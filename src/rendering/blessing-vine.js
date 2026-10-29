import * as THREE from 'three';
import {rasterizeAwakeningRoots} from './awakening-roots-data.js';
let shared;
// One shared, code-drawn botanical seal. No per-wall texture or fragment path loop.
export function blessingVineTexture(){
  if(shared)return shared;
  const paths=[],stem=x=>.89+.16*Math.sin(x*5.2);
  paths.push(Array.from({length:161},(_,i)=>{const x=-.88+i/160*1.76;return {x,z:stem(x),strength:.9};}));
  paths.push(Array.from({length:151},(_,i)=>{const t=i/150,a=-1.3+t*Math.PI*3.8,r=.27*(1-t)+.015;return {x:-.02+Math.cos(a)*r,z:1.16+Math.sin(a)*r,strength:1};}));
  for(const [x,side] of [[-.72,1],[-.52,-1],[-.32,1],[.31,-1],[.52,1],[.76,1]]){
    const y=stem(x),angle=side>0?.9:-.8;
    for(let fill=-.035;fill<=.035;fill+=.003)paths.push(Array.from({length:25},(_,i)=>{const t=i/24,d=t*.23,w=Math.sin(t*Math.PI)*fill;return {x:x+Math.cos(angle)*d-Math.sin(angle)*w,z:y+Math.sin(angle)*d+Math.cos(angle)*w,strength:.85};}));
  }
  const data=rasterizeAwakeningRoots(paths,{minX:-1,minZ:0,size:2},512,.005);
  shared=new THREE.DataTexture(data,512,512,THREE.RedFormat);shared.minFilter=shared.magFilter=THREE.LinearFilter;shared.generateMipmaps=false;shared.needsUpdate=true;
  return shared;
}
