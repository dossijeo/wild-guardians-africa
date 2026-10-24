const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,z){let p=[x,0,z].map(v=>fract(v*.1031));const d=p[0]*(p[1]+33.33)+p[1]*(p[2]+33.33)+p[2]*(p[0]+33.33);p=p.map(v=>v+d);return fract((p[0]+p[1])*p[2]);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z);let u=fract(x),v=fract(z);u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(ix,iz),hash(ix+1,iz),u),mix(hash(ix,iz+1),hash(ix+1,iz+1),u),v);}
export function canyonDepositMask(source,bo){const data=source.slice();for(let z=0;z<35;z++)for(let x=0;x<35;x++){const wx=bo.minX+(x-1)*1.5,wz=bo.minZ+(z-1)*1.5;data[(z*35+x)*4+1]=Math.round((noise(wx*.1,wz*.1)*.75+noise(wx*.27,wz*.27)*.25)*255);}return data;}
