// Explicit global visual laboratory option. Existing maps and silhouettes are retained.
function patchProceduralAsh(source){
 const anchors=['float reliefMask=canyon?canyonFlat:up;','color=clamp(mix(original,tex,amount),0.,1.);','uGroundParams.z*uGroundMicro*amount*normalFade','rough=baseRough;','materialAO410=mix(1.,mix(.45,1.,arh.r),amount);'];
 if(!anchors.every(a=>source.includes(a)))throw Error('Volcanic ash shader anchor missing');
 return source.replace(anchors[0],`${anchors[0]}
 float qaAsh=0.;
 if(rock){vec3 p=worldPatternPosition(worldP);float broad=materialNoise(vec3(p.x*.075,7.1,p.z*.075));float edge=materialNoise(vec3(p.x*.24,13.7,p.z*.24));qaAsh=smoothstep(.39,.66,broad*.78+edge*.22)*smoothstep(.78,.97,Ng.y);reliefMask*=1.-qaAsh*.85;}
 `).replace(anchors[1],`if(rock){float fine=dot(tex,vec3(.2126,.7152,.0722));vec3 ash=vec3(.30,.285,.265)*(.86+fine*.38);tex=mix(tex,ash,qaAsh*.78);}
 ${anchors[1]}`).replace(anchors[2],anchors[2]+'*(1.-qaAsh*.82)').replace(anchors[3],'rough=mix(baseRough,.96,qaAsh*.8);').replace(anchors[4],anchors[4]+'materialAO410=mix(materialAO410,1.,qaAsh*.65);');
}

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


export function volcanicAshMode(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search),mode=q.get('volcanicAsh');
 return q.get('visualLab')==='global-lighting'&&['procedural','mask'].includes(mode)?mode:null;
}
export function patchVolcanicAsh(source,mode){
 if(!['procedural','mask'].includes(mode))return source;
 source=patchProceduralAsh(source);
 if(mode==='mask')source=source.replace('if(rock){vec3 p=worldPatternPosition(worldP);','if(rock){float field=ctx.r;if(uGroundMapped<.5){vec3 p=worldPatternPosition(worldP);').replace('qaAsh=smoothstep(.39,.66,broad*.78+edge*.22)','field=broad*.78+edge*.22;}qaAsh=smoothstep(.39,.66,field)');
 return source;
}
