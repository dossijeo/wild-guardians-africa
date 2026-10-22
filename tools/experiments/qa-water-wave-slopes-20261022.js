import * as THREE from 'three';
// Periodic analytic wave gradients; authored numerical data, no external asset.
export function createWaveSlopeTexture(){
 const size=256,data=new Uint8Array(size*size*2);
 const waves=[[5,2,.1],[2,7,1.7],[-6,3,2.4],[8,-5,.7],[3,-9,3.1],[-7,-4,4.2],[11,3,1.1],[-4,12,5.2],[13,-7,2.1],[7,14,4.8],[-15,5,3.8],[-9,-13,5.7]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let sx=0,sy=0;
  for(const [kx,ky,phase]of waves){const length=Math.hypot(kx,ky),v=Math.cos(2*Math.PI*(kx*(x+.5)+ky*(y+.5))/size+phase)*.20;sx+=v*kx/length;sy+=v*ky/length;}
  const at=(y*size+x)*2;data[at]=Math.round(Math.max(0,Math.min(1,sx/3+.5))*255);data[at+1]=Math.round(Math.max(0,Math.min(1,sy/3+.5))*255);
 }
 const t=new THREE.DataTexture(data,size,size,THREE.RGFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
