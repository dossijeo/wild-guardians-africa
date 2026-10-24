const F=Math.fround,fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y,z){
 x=F(fract(F(x*F(.1031))));y=F(fract(F(y*F(.1031))));z=F(fract(F(z*F(.1031))));
 const d=F(F(F(x*F(y+F(33.33)))+F(y*F(z+F(33.33))))+F(z*F(x+F(33.33))));
 x=F(x+d);y=F(y+d);z=F(z+d);return fract(F(F(x+y)*z));
}
function noise(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),smooth=v=>v*v*(3-2*v);
 const a=smooth(fract(x)),b=smooth(fract(y)),c=smooth(fract(z));
 return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),a),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c);
}
// Clone: worker-owned bytes and other material channels remain untouched.
// Store pre-smoothstep field to interpolate before the nonlinear threshold.
export function ashMask(bytes,bounds){
 if(bytes.length!==35*35*4)throw Error('Unexpected ground mask size');
 const result=bytes.slice();
 for(let z=0;z<35;z++)for(let x=0;x<35;x++){
  const px=bounds.minX+(x-1)*1.5,pz=bounds.minZ+(z-1)*1.5;
  const n=noise(F(px*F(.075)),F(7.1),F(pz*F(.075)))*.78+noise(F(px*F(.24)),F(13.7),F(pz*F(.24)))*.22;
  result[(z*35+x)*4]=Math.round(Math.max(0,Math.min(1,n))*255);
 }
 return result;
}
