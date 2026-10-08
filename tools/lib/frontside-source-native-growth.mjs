// Camera-independent CPU reference of native crop vertex transport. Float64
// arithmetic does not certify GLSL execution or proxy image equivalence.
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const unit=v=>{const length=Math.hypot(...v);if(!(length>0)||!Number.isFinite(length))throw Error('Undefined transported source normal');return v.map(x=>x/length);};
const mat3=(m,v)=>[m[0]*v[0]+m[3]*v[1]+m[6]*v[2],m[1]*v[0]+m[4]*v[1]+m[7]*v[2],m[2]*v[0]+m[5]*v[1]+m[8]*v[2]];
const point=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const IDENTITY4=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],IDENTITY3=[1,0,0,0,1,0,0,0,1];

export function nativeSourceVertex(position,normal,growth,{ground,height,clock,wind},{instanceMatrix=IDENTITY4,modelViewMatrix=IDENTITY4,normalMatrix=IDENTITY3,flipSided=false}={}){
 if(position.length!==3||normal.length!==3||growth.length!==4||instanceMatrix.length!==16||modelViewMatrix.length!==16||normalMatrix.length!==9||![...position,...normal,...growth,ground,height,clock,wind,...instanceMatrix,...modelViewMatrix,...normalMatrix].every(Number.isFinite))throw Error('Invalid native source transport inputs');
 const mask=smooth(ground,ground+.12,position[1]),above=Math.max(0,position[1]-ground),sy=mix(1,growth[0],mask),sr=mix(1,growth[1],mask);
 const p=[position[0]*sr,position[1]+above*(sy-1),position[2]*sr];
 const leafMask=mask*smooth(.035,.22,Math.hypot(position[0],position[2])),folded=1-growth[2];
 p[0]*=1-leafMask*folded*.16;p[2]*=1-leafMask*folded*.16;p[1]+=leafMask*folded*(.10+above*.12);
 const h=Math.min(1,Math.max(0,above/Math.max(.15,height-ground)));
 const breeze=(Math.sin(clock*1.55+growth[3])*.017+Math.sin(clock*2.71+growth[3]*1.7)*.009)*h**1.7*wind*mask;
 p[0]+=breeze;p[2]+=.47*breeze;
 let n=unit([normal[0]/sr,normal[1]/sy,normal[2]/sr]);
 const im=[instanceMatrix[0],instanceMatrix[1],instanceMatrix[2],instanceMatrix[4],instanceMatrix[5],instanceMatrix[6],instanceMatrix[8],instanceMatrix[9],instanceMatrix[10]],length2=[0,3,6].map(i=>im[i]**2+im[i+1]**2+im[i+2]**2);
 n=mat3(normalMatrix,mat3(im,n.map((v,i)=>v/length2[i])));if(flipSided)n=n.map(v=>-v);
 return{objectPosition:p,viewPosition:point(modelViewMatrix,point(instanceMatrix,p)),viewVertexNormal:unit(n),originalUvUnchanged:true};
}
