
/* POBLADOS / LAB · Native WebGL 2 renderer. No remote resources. */
'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)}};
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul:(a,b)=>{let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o},
 perspective:(fov,aspect,near,far)=>{let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])},
 ortho:(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]),
 look:(eye,target,up=[0,1,0])=>{let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},
 point:(m,v)=>[0,1,2,3].map(i=>m[i]*v[0]+m[i+4]*v[1]+m[i+8]*v[2]+m[i+12]),
 model:(scale,angle,y)=>{let c=Math.cos(angle)*scale,s=Math.sin(angle)*scale;return new Float32Array([c,0,-s,0,0,scale,0,0,s,0,c,0,0,y,0,1])}
};
function seedHash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const hex=h=>{let n=parseInt(h.replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
function b64bytes(str){let s=atob(str),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
class Geometry {
 constructor(){this.data=[];this.indices=[];this.count=0}
 vertex(p,n,uv,c){this.data.push(...p,...n,...uv,...c);return this.count++}
 tri(a,b,c){this.indices.push(a,b,c)}
 quad(a,b,c,d){this.indices.push(a,b,c,a,c,d)}
 /* Smooth irregular ellipsoid. Full indexed surfaces; not billboard trees. */
 ellipsoid(center,radii,yaw,color,seed=0,segments=14,rings=9,noise=.06){
  const off=this.count,co=Math.cos(yaw),si=Math.sin(yaw);
  for(let j=0;j<=rings;j++){let v=j/rings,ph=v*Math.PI;for(let i=0;i<=segments;i++){
   let u=i/segments,th=u*Math.PI*2;let q=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)];
   let d=1+noise*(Math.sin(q[0]*8+seed)*Math.sin(q[2]*7+seed*.71)+.45*Math.sin(q[1]*12+q[0]*6));
   let p=q.map((x,k)=>x*radii[k]*d),n=V.norm(q.map((x,k)=>x/radii[k]));
   p=[co*p[0]+si*p[2]+center[0],p[1]+center[1],-si*p[0]+co*p[2]+center[2]];
   n=[co*n[0]+si*n[2],n[1],-si*n[0]+co*n[2]];
   let shade=.86+.13*(q[1]+1)*.5+.065*Math.sin(q[0]*12+q[2]*6+seed);
   this.vertex(p,n,[u,v],color.map(x=>clamp(x*shade,0,1)));
  }}
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){let a=off+j*(segments+1)+i,b=a+segments+1;this.quad(a,a+1,b+1,b)}
 }
 tube(points,radii,color,segments=9){
  const off=this.count;
  for(let j=0;j<points.length;j++){
   let axis=V.norm(V.sub(points[Math.min(j+1,points.length-1)],points[Math.max(0,j-1)]));
   let right=V.norm(V.cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),front=V.norm(V.cross(axis,right));
   for(let i=0;i<=segments;i++){let a=i/segments*Math.PI*2,n=V.add(V.mul(right,Math.cos(a)),V.mul(front,Math.sin(a))),rad=radii[j]*(1+.055*Math.sin(a*5));
    this.vertex(V.add(points[j],V.mul(n,rad)),n,[i/segments,j/(points.length-1)],color.map(v=>v*(.91+.10*Math.sin(a*3+.6))));
   }
  }
  for(let j=0;j<points.length-1;j++)for(let i=0;i<segments;i++){let a=off+j*(segments+1)+i,b=a+segments+1;this.quad(a,a+1,b+1,b)}
 }
}
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;layout(location=3) in vec3 aColor;
uniform mat4 uModel,uVP,uLightVP;
out vec3 vWorld;out vec3 vNormal;out vec2 vUV;out vec3 vColor;out vec4 vShadow;
void main(){vec4 p=uModel*vec4(aPosition,1.);vWorld=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);vUV=aUV;vColor=aColor;vShadow=uLightVP*p;gl_Position=uVP*p;}`;
const FS=`#version 300 es
precision highp float;
in vec3 vWorld;in vec3 vNormal;in vec2 vUV;in vec3 vColor;in vec4 vShadow;
uniform sampler2D uColorMap,uNormalMap,uRoughMap,uShadowMap;
uniform vec3 uEye,uSun;uniform int uMode;uniform bool uShadows;uniform float uShadowTexel;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float shad(vec3 n){if(!uShadows)return 1.;vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.x<=0.||p.y<=0.||p.x>=1.||p.y>=1.||p.z>=1.)return 1.;float bias=max(.00022,.0011*(1.-max(dot(n,uSun),0.)));float occ=0.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){float d=texture(uShadowMap,p.xy+vec2(i,j)*uShadowTexel).r;occ+=p.z-bias>d?1.:0.;}return 1.-occ/9.*.79;}
vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
void main(){
 if(uMode==3){outColor=vec4(vColor,.82);return;}
 vec3 n=normalize(vNormal),base=vColor;float rough=.92;
 if(!gl_FrontFacing)n=-n;
 if(uMode==1){
  base=texture(uColorMap,vUV).rgb;rough=clamp(texture(uRoughMap,vUV).g,.55,1.);
  vec3 tn=texture(uNormalMap,vUV).xyz*2.-1.;tn.xy*=.42;
  vec3 q1=dFdx(vWorld),q2=dFdy(vWorld);vec2 st1=dFdx(vUV),st2=dFdy(vUV);
  vec3 T=q1*st2.y-q2*st1.y,B=-q1*st2.x+q2*st1.x;
  float det=st1.x*st2.y-st1.y*st2.x;
  if(abs(det)>1e-9&&length(T)>1e-6&&length(B)>1e-6){T=normalize(T*sign(det));B=normalize(B*sign(det));n=normalize(T*tn.x+B*tn.y+n*tn.z);}
 }
 if(uMode==2){float a=sin(vWorld.x*.27+sin(vWorld.z*.19)*1.2)*sin(vWorld.z*.23+1.7)*.025;float grain=(hash(floor(vWorld.xz*19.))-0.5)*.025;base+=a+grain;}
 base=pow(max(base,vec3(0.)),vec3(2.2));
 vec3 sky=mix(vec3(.30,.24,.18),vec3(.65,.72,.80),n.y*.5+.5);
 float diffuse=max(dot(n,uSun),0.);float visibility=shad(n);
 float fill=max(dot(n,normalize(vec3(.8,.5,-.65))),0.);
 vec3 radiance=base*(sky*.77+vec3(1.0,.87,.70)*diffuse*1.8*visibility+vec3(.53,.65,.8)*fill*.16);
 vec3 view=normalize(uEye-vWorld),halfV=normalize(uSun+view);
 float shine=pow(max(dot(n,halfV),0.),mix(42.,6.,rough))*.04*(1.-rough*.65)*visibility;
 radiance+=vec3(1.0,.9,.75)*shine;
 outColor=vec4(pow(aces(radiance*.85),vec3(1./2.2)),1.);
}`;
const DEPTHVS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPosition;uniform mat4 uModel,uVP;void main(){gl_Position=uVP*uModel*vec4(aPosition,1.);}`;
const DEPTHFS=`#version 300 es
precision highp float;void main(){}`;
class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  if(!this.gl)throw Error('Este visor necesita WebGL 2. Ábrelo en un navegador con aceleración gráfica, como Chrome o Edge.');
  const gl=this.gl;this.program=this.programFrom(VS,FS);this.depthProgram=this.programFrom(DEPTHVS,DEPTHFS);this.loc={};
  for(const n of ['uModel','uVP','uLightVP','uEye','uSun','uMode','uShadows','uShadowTexel','uColorMap','uNormalMap','uRoughMap','uShadowMap'])this.loc[n]=gl.getUniformLocation(this.program,n);
  this.dloc={model:gl.getUniformLocation(this.depthProgram,'uModel'),vp:gl.getUniformLocation(this.depthProgram,'uVP')};
  this.lightVP=M.mul(M.ortho(-47,47,-47,47,1,150),M.look([-34,48,-26],[0,0,0]));this.sun=V.norm([-34,48,-26]);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);this.shadowSize=Math.min(2048,gl.getParameter(gl.MAX_TEXTURE_SIZE));
  this.shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.clearColor(...hex('#e7e5dc'),1);this.textures=[];this.needsShadow=true;this.drawCalls=0;
 }
 programFrom(vs,fs){let gl=this.gl;const shader=(src,type)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};let p=gl.createProgram(),v=shader(vs,gl.VERTEX_SHADER),f=shader(fs,gl.FRAGMENT_SHADER);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
 async texture(url){let gl=this.gl,img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se pudo decodificar una textura integrada.'));img.src=url});let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);let ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));this.textures.push(t);return t}
 upload(vertices,indices,stride=11){const gl=this.gl;let vao=gl.createVertexArray();gl.bindVertexArray(vao);let vbo=gl.createBuffer(),ibo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);for(const[a,n,o]of[[0,3,0],[1,3,3],[2,2,6]]){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,stride*4,o*4)}if(stride===11){gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,3,gl.FLOAT,false,44,32)}else{gl.disableVertexAttribArray(3);gl.vertexAttrib3f(3,1,1,1)}gl.bindVertexArray(null);return{vao,vbo,ibo,count:indices.length}}
 mesh(geom,mode=0,cast=true){let b=this.upload(new Float32Array(geom.data),new Uint32Array(geom.indices));return{...b,mode,cast,offset:0,model:M.identity(),visible:true}}
 dispose(mesh){if(!mesh)return;let gl=this.gl;gl.deleteVertexArray(mesh.vao);gl.deleteBuffer(mesh.vbo);gl.deleteBuffer(mesh.ibo)}
 resize(){let dpr=Math.min(devicePixelRatio||1,innerWidth<650?1.55:1.75);let w=Math.round(this.canvas.clientWidth*dpr),h=Math.round(this.canvas.clientHeight*dpr);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;return true}return false}
 draw(mesh,depth=false){if(!mesh.visible||!mesh.count)return;let gl=this.gl;gl.bindVertexArray(mesh.vao);gl.uniformMatrix4fv(depth?this.dloc.model:this.loc.uModel,false,mesh.model);if(!depth)gl.uniform1i(this.loc.uMode,mesh.mode);gl.drawElements(mesh.lines?gl.LINES:gl.TRIANGLES,mesh.count,gl.UNSIGNED_INT,(mesh.offset||0)*4);this.drawCalls++}
 render(meshes,overlay,cam,shadows=true){
  let gl=this.gl;this.resize();this.drawCalls=0;
  if(this.needsShadow&&this.shadowOK){
   // A depth texture must not be bound for sampling while it is a render target.
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,null);gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.viewport(0,0,this.shadowSize,this.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.colorMask(false,false,false,false);gl.useProgram(this.depthProgram);gl.uniformMatrix4fv(this.dloc.vp,false,this.lightVP);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,2.);
   for(let m of meshes)if(m.cast)this.draw(m,true);gl.disable(gl.POLYGON_OFFSET_FILL);gl.colorMask(true,true,true,true);gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.needsShadow=false;
  }
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  let vp=M.mul(M.perspective(Math.PI/4.5,this.canvas.width/this.canvas.height,.1,600),M.look(cam.eye,cam.target));this.vp=vp;
  gl.uniformMatrix4fv(this.loc.uVP,false,vp);gl.uniformMatrix4fv(this.loc.uLightVP,false,this.lightVP);gl.uniform3fv(this.loc.uEye,cam.eye);gl.uniform3fv(this.loc.uSun,this.sun);gl.uniform1i(this.loc.uShadows,shadows&&this.shadowOK?1:0);gl.uniform1f(this.loc.uShadowTexel,1/this.shadowSize);
  for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);gl.uniform1i(this.loc[['uColorMap','uNormalMap','uRoughMap'][i]],i)}gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.uniform1i(this.loc.uShadowMap,3);
  for(let m of meshes)this.draw(m);
  if(overlay?.visible){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);this.draw(overlay);gl.depthMask(true);gl.disable(gl.BLEND)}
  gl.bindVertexArray(null);
 }
}
function circleHitsPolygon(x,z,r,poly){
 let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  let a=poly[j],b=poly[i];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  let dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);if(Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<=r)return true;
 }return inside;
}
function polygonDistance(x,z,p){let min=1e9;for(let i=0;i<p.length;i++){let a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);min=Math.min(min,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t))}return circleHitsPolygon(x,z,0,p)?-min:min}
function heightAt(x,z){let q=state.phase;let h=.34*Math.sin(x*.19+q)*Math.cos(z*.13-q)+.20*Math.sin((x+z)*.24+q*2)+.32*Math.sin(z*.09+1);return h*smooth(19,30,Math.hypot(x,z))}
const state={seed:'MAPU-1872',treeCount:16,rockCount:10,angle:0,margin:.20,phase:1,showFootprints:false,shadows:true,autoRotate:false,villageId:'mapungubwe',selection:null,ready:false};
const scene={environment:[],buildings:[],obstacles:[],colliders:[],overlay:null,terrain:null,grass:null};
let renderer,modelGPU,modelCPU,source,VILLAGES; // source kept for backward compatibility
const camera={yaw:-.84,pitch:.73,distance:68,target:[0,.6,0],eye:[0,0,0],update(){this.eye=V.add(this.target,[this.distance*Math.cos(this.pitch)*Math.sin(this.yaw),this.distance*Math.sin(this.pitch),this.distance*Math.cos(this.pitch)*Math.cos(this.yaw)])}};
function makeTerrain(){
 const g=new Geometry(),n=96,size=64,base=hex('#a99777'),light=hex('#b7a688'),green=hex('#979970');
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
  let x=(i/n-.5)*size,z=(j/n-.5)*size,y=heightAt(x,z),eps=.08,norm=V.norm([heightAt(x-eps,z)-heightAt(x+eps,z),eps*2,heightAt(x,z-eps)-heightAt(x,z+eps)]);
  let a=(Math.sin(x*.18+state.phase)*Math.sin(z*.21+state.phase*.8)+1)*.5;let c=base.map((v,k)=>mix(v,green[k],a*.60));let center=1-smooth(12,24,Math.hypot(x*.94,z));c=c.map((v,k)=>mix(v,light[k],center*.54));g.vertex([x,y,z],norm,[i/n,j/n],c);
 }
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i,b=a+n+1;g.quad(a,b,b+1,a+1)}
 // Shallow earthen cutaway edges, with natural strata and a dark underside.
 for(let side=0;side<4;side++)for(let i=0;i<n;i++){
  const xy=t=>side===0?[-32+t*64,-32]:side===1?[32,-32+t*64]:side===2?[32-t*64,32]:[-32,32-t*64];
  let a=xy(i/n),b=xy((i+1)/n),normal=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]][side];
  for(let j=0;j<3;j++){let h1=heightAt(...a),h2=heightAt(...b),drop=[0,.30,.76][j],y1=h1-drop,y2=h2-drop,bot1=j===2?-1.7:h1-[.30,.76][j],bot2=j===2?-1.7:h2-[.30,.76][j];
   let col=[hex('#ad8552'),hex('#a17a4c'),hex('#8a6543')][j],o=g.count;
   g.vertex([a[0],y1,a[1]],normal,[0,0],col);g.vertex([b[0],y2,b[1]],normal,[1,0],col);g.vertex([b[0],bot2,b[1]],normal,[1,1],col);g.vertex([a[0],bot1,a[1]],normal,[0,1],col);g.quad(o,o+1,o+2,o+3);
  }
 }
 return renderer.mesh(g,2,false);
}
function makeTree(desc,bark,leaves){
 const r=random(desc.detail),{x,z}=desc,y=heightAt(x,z),h=desc.height,spread=desc.spread,rot=r()*Math.PI*2;
 const trunk=hex(desc.type?'#876a43':'#82704b'),leaf=hex(desc.type?'#819754':'#94a65e');
 let bx=Math.cos(rot)*.45,bz=Math.sin(rot)*.45,wide=desc.type?.46:.25;
 bark.tube([[x,y-.04,z],[x+.09,y+h*.24,z],[x+bx*.65,y+h*.52,z+bz*.65],[x+bx,y+h*.78,z+bz]], [wide*1.5,wide*1.10,wide*.74,wide*.36],trunk,10);
 for(let i=0;i<5;i++){
  let a=rot+i/5*Math.PI*2+(r()-.5)*.35,rad=spread*(.45+r()*.10),px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad,py=y+h*(.89+r()*.11);
  bark.tube([[x+bx*.6,y+h*.50,z+bz*.6],[x+Math.cos(a)*rad*.45,y+h*.76,z+Math.sin(a)*rad*.45],[px,py,pz]],[wide*.49,wide*.28,.05],trunk,7);
  let rx=spread*(.51+r()*.075),rz=spread*(.40+r()*.09);leaves.ellipsoid([px,py+.16,pz],[rx,.39+r()*.24,rz],a,leaf,desc.detail+i,16,10,.075);
 }
 leaves.ellipsoid([x+bx*.6,y+h+.16,z+bz*.6],[spread*.62,.43,spread*.52],rot,leaf,desc.detail,16,10,.08);
}
function generateEnvironment(){
 for(let m of scene.environment)renderer.dispose(m);scene.environment=[];scene.colliders=[];scene.obstacles=[];
 state.phase=(seedHash(state.seed)%10000)*.001;scene.terrain=makeTerrain();scene.environment.push(scene.terrain);
 const bark=new Geometry(),leaves=new Geometry(),rock=new Geometry();const rt=random(seedHash(state.seed+'|trees')),rr=random(seedHash(state.seed+'|rocks'));
 // Random positions are chosen BEFORE building placement, without consulting the village layout.
 function position(r,space){let x=0,z=0;for(let k=0;k<90;k++){x=(r()-.5)*56;z=(r()-.5)*56;if(scene.obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>space+o.spacing))break}return{x,z}}
 for(let i=0;i<state.treeCount;i++){
  let p=position(rt,1.2),spread=1.7+rt()*.85,height=3.3+rt()*2.4;
  let d={...p,height,spread,spacing:1.5,detail:Math.floor(rt()*1e6),type:rt()<.2,id:'tree-'+i,name:'Árbol '+String(i+1).padStart(2,'0'),kind:'Árbol'};scene.obstacles.push(d);makeTree(d,bark,leaves);
  // The clearance includes the canopy, not just the trunk, preventing crowns cutting roofs.
  scene.colliders.push({x:p.x,z:p.z,r:spread*1.22,id:d.id,name:d.name,kind:d.kind});
 }
 for(let i=0;i<state.rockCount;i++){
  let p=position(rr,1.3),d={...p,id:'rock-'+i,name:'Formación rocosa '+String(i+1).padStart(2,'0'),kind:'Roca',spacing:1.3};scene.obstacles.push(d);let number=3+Math.floor(rr()*3),size=.72+rr()*.72,ang=rr()*Math.PI*2;
  for(let j=0;j<number;j++){
   let a=ang+j*2.3999,rad=j===0?0:rr()*1.3*size,x=p.x+Math.cos(a)*rad,z=p.z+Math.sin(a)*rad,rx=size*(.64+rr()*.48),rz=size*(.62+rr()*.47),ry=size*(.75+rr()*.88),h=heightAt(x,z);
   rock.ellipsoid([x,h+ry*.72-.08,z],[rx,ry,rz],rr()*Math.PI,hex(j%2?'#a88964':'#b59a75'),rr()*15,16,12,.08);
   scene.colliders.push({x,z,r:Math.max(rx,rz)*1.19,id:d.id,name:d.name,kind:d.kind});
  }
 }
 scene.environment.push(renderer.mesh(bark),renderer.mesh(leaves),renderer.mesh(rock));
 renderer.needsShadow=true;
}
function placeVillage(){
 let theta=state.angle*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta),scale=16;
 for(let b of scene.buildings){
  let unit=b.unit;b.model=M.model(scale,theta,-unit.min[1]*scale+.018);b.hull=unit.hull.map(p=>[scale*(c*p[0]+s*p[1]),scale*(-s*p[0]+c*p[1])]);
  let hits=new Map();for(let o of scene.colliders)if(circleHitsPolygon(o.x,o.z,o.r+state.margin,b.hull))hits.set(o.id,o);
  b.hits=Array.from(hits.values());b.visible=b.hits.length===0;b.center=b.hull.reduce((a,p)=>[a[0]+p[0]/b.hull.length,a[1]+p[1]/b.hull.length],[0,0]);
 }
 makeGrass();makeOverlay();renderer.needsShadow=true;
 if(typeof refreshUI==='function')refreshUI();dirty=true;
}
function makeGrass(){
 renderer.dispose(scene.grass);const g=new Geometry(),r=random(seedHash(state.seed+'|grass'));let count=0;
 for(let i=0;i<1500&&count<860;i++){
  let x=(r()-.5)*62,z=(r()-.5)*62;if(scene.buildings.some(b=>b.visible&&circleHitsPolygon(x,z,.32,b.hull)))continue;
  if(scene.colliders.some(o=>o.kind==='Roca'&&Math.hypot(o.x-x,o.z-z)<o.r+.18))continue;
  let h=heightAt(x,z)+.01,shade=hex(i%3?'#a49e66':'#b0a16a');for(let j=0;j<3;j++){
   let a=r()*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a),w=.045+r()*.035,height=.14+r()*.24,lean=.10;let o=g.count,n=[-dz,.15,dx];
   g.vertex([x-dx*w,h,z-dz*w],n,[0,0],shade);g.vertex([x+dx*w,h,z+dz*w],n,[1,0],shade);g.vertex([x+dx*lean,h+height,z+dz*lean],n,[.5,1],shade.map(v=>v*1.13));g.tri(o,o+1,o+2);
  }count++;
 }
 scene.grass=renderer.mesh(g,0,false);
}
function makeOverlay(){
 renderer.dispose(scene.overlay);let g=new Geometry();
 const line=(a,b,color)=>{let o=g.count;g.vertex(a,[0,1,0],[0,0],color);g.vertex(b,[0,1,0],[0,0],color);g.indices.push(o,o+1)};
 for(let b of scene.buildings){if(!state.showFootprints&&state.selection!==b.unit.key)continue;let color=hex(b.visible?'#368364':'#df694e');if(state.selection===b.unit.key)color=hex('#f1c24b');for(let i=0;i<b.hull.length;i++){let a=b.hull[i],p=b.hull[(i+1)%b.hull.length];line([a[0],.085,a[1]],[p[0],.085,p[1]],color)}
  if(!b.visible){let xs=b.hull.map(p=>p[0]),zs=b.hull.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2,sz=.5;line([cx-sz,.09,cz-sz],[cx+sz,.09,cz+sz],color);line([cx-sz,.09,cz+sz],[cx+sz,.09,cz-sz],color)}
 }
 if(state.showFootprints)for(let o of scene.colliders){let color=hex('#c68641');for(let j=0;j<40;j++){let a=j/40*Math.PI*2,b=(j+1)/40*Math.PI*2,x=o.x+Math.cos(a)*(o.r+state.margin),z=o.z+Math.sin(a)*(o.r+state.margin),xx=o.x+Math.cos(b)*(o.r+state.margin),zz=o.z+Math.sin(b)*(o.r+state.margin);line([x,heightAt(x,z)+.075,z],[xx,heightAt(xx,zz)+.075,zz],color)}}
 scene.overlay=renderer.mesh(g,3,false);scene.overlay.lines=true;scene.overlay.visible=true;
}
let dirty=true,lastTime=0,frames=0,lastFPS=0;
function animate(now){requestAnimationFrame(animate);if(!state.ready||document.hidden)return;let dt=Math.min(.04,(now-lastTime)/1000||0);lastTime=now;if(state.autoRotate){camera.yaw+=dt*.09;dirty=true}if(dirty){camera.update();renderer.render([...scene.environment,scene.grass,...scene.buildings],scene.overlay,camera,state.shadows);dirty=false;if(typeof updateLabels==='function')updateLabels()} }
function fitCamera(kind='village'){
 camera.target=[0,.65,0];camera.yaw=-.84;camera.pitch=kind==='top'?1.53:.73;
 const mobile=innerWidth<650,aspect=renderer.canvas.clientWidth/renderer.canvas.clientHeight;
 const points=[];
 if(kind==='terrain'){
  for(let x of [-32,32])for(let z of [-32,32]){points.push([x,heightAt(x,z),z],[x,-1.7,z])}
  for(let o of scene.obstacles)points.push([o.x,heightAt(o.x,o.z)+(o.height||3)+.8,o.z]);
 }else{
  for(let b of scene.buildings){let u=b.unit;for(let x of [u.min[0],u.max[0]])for(let z of [u.min[2],u.max[2]])for(let y of [u.min[1],u.max[1]])points.push(M.point(b.model,[x,y,z]).slice(0,3))}
 }
 const fits=d=>{let eye=V.add(camera.target,[d*Math.cos(camera.pitch)*Math.sin(camera.yaw),d*Math.sin(camera.pitch),d*Math.cos(camera.pitch)*Math.cos(camera.yaw)]),vp=M.mul(M.perspective(Math.PI/4.5,aspect,.1,600),M.look(eye,camera.target));return points.every(p=>{let q=M.point(vp,p),x=q[0]/q[3],y=q[1]/q[3];return q[3]>0&&Math.abs(x)<.89&&y>-.78&&y<.80})};
 let lo=20,hi=350;for(let i=0;i<20;i++){let d=(lo+hi)/2;if(fits(d))hi=d;else lo=d}
 camera.distance=Math.max(kind==='village'?(mobile?94:64):kind==='top'?60:80,hi);
 dirty=true;
}
function setupCamera(){
 let canvas=renderer.canvas,points=new Map(),previous=null,start=null,travel=0,mode='orbit';
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);points.set(e.pointerId,[e.clientX,e.clientY]);if(points.size===1){previous=[e.clientX,e.clientY];start=previous;travel=0;mode=e.button===2||e.shiftKey?'pan':'orbit'}else previous=null;state.autoRotate=false;if($('autoRotate'))$('autoRotate').checked=false});
 const pan=(dx,dy)=>{let unit=camera.distance*.00105,cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw);camera.target[0]+=(-dx*cy-dy*sy)*unit;camera.target[2]+=(dx*sy-dy*cy)*unit;camera.target[0]=clamp(camera.target[0],-27,27);camera.target[2]=clamp(camera.target[2],-27,27)};
 canvas.addEventListener('pointermove',e=>{
  if(!points.has(e.pointerId))return;
  if(points.size>=2){let old=Array.from(points.values()).slice(0,2);points.set(e.pointerId,[e.clientX,e.clientY]);let cur=Array.from(points.values()).slice(0,2);let od=Math.hypot(old[0][0]-old[1][0],old[0][1]-old[1][1]),nd=Math.hypot(cur[0][0]-cur[1][0],cur[0][1]-cur[1][1]);camera.distance=clamp(camera.distance*(od/Math.max(nd,1)),18,350);pan((cur[0][0]+cur[1][0]-old[0][0]-old[1][0])*.5,(cur[0][1]+cur[1][1]-old[0][1]-old[1][1])*.5);travel=99;previous=null;
  }else{let old=points.get(e.pointerId);let dx=e.clientX-old[0],dy=e.clientY-old[1];points.set(e.pointerId,[e.clientX,e.clientY]);travel+=Math.abs(dx)+Math.abs(dy);if(mode==='pan')pan(dx,dy);else{camera.yaw-=dx*.006;camera.pitch=clamp(camera.pitch+dy*.005,.18,1.54)}}dirty=true;
 });
 const up=e=>{if(points.has(e.pointerId)&&points.size===1&&travel<7&&e.button!==2&&typeof pickBuilding==='function')pickBuilding(e.clientX,e.clientY);points.delete(e.pointerId);previous=null};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>points.delete(e.pointerId));
 canvas.addEventListener('wheel',e=>{e.preventDefault();camera.distance=clamp(camera.distance*Math.exp(clamp(e.deltaY,-180,180)*.0012),18,350);dirty=true},{passive:false});
 addEventListener('resize',()=>{dirty=true});addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='KeyF'){fitCamera()}if(e.code==='KeyR'&&typeof newSeed==='function')newSeed();if(e.code==='Escape'){state.selection=null;makeOverlay();if(typeof refreshInspector==='function')refreshInspector();dirty=true}});
}
async function initialize(){
 try{
  state.ready=false;
  const payloadElement=$('villagesPayload');
  if(!payloadElement)throw Error('No se encuentra el catálogo integrado de poblados.');
  const payloads=JSON.parse(payloadElement.textContent);
  if(!Array.isArray(payloads)||payloads.length===0)throw Error('El catálogo integrado no contiene poblados.');
  const seenIds=new Set();
  for(const payload of payloads){
   if(!payload.id||seenIds.has(payload.id))throw Error('El catálogo contiene un identificador de poblado inválido.');
   seenIds.add(payload.id);
   if(typeof payload.binary!=='string'||!Array.isArray(payload.units)||!payload.units.length||!payload.textures)throw Error('Faltan datos integrados de '+(payload.name||payload.id)+'.');
  }
  // Release the duplicate DOM copy before decoding the embedded assets.
  payloadElement.textContent='';
  renderer=new Renderer($('viewport'));VILLAGES=[];
  const loadingTitle=$('loading')?.querySelector('h2');
  const loadingText=$('loading')?.querySelector('p');
  for(let i=0;i<payloads.length;i++){
   const payload=payloads[i];
   if(loadingTitle)loadingTitle.textContent='Preparando '+payload.shortName;
   if(loadingText)loadingText.textContent='Poblado '+(i+1)+' de '+payloads.length+' · Cargando modelo y texturas integradas. No se necesita conexión.';
   await new Promise(resolve=>setTimeout(resolve,0));
   const bytes=b64bytes(payload.binary);
   const vertexBytes=payload.vertexBytes,indexCount=payload.indexCount;
   if(!Number.isSafeInteger(vertexBytes)||vertexBytes<=0||vertexBytes%32||!Number.isSafeInteger(indexCount)||indexCount<=0||indexCount%3||vertexBytes+indexCount*4!==bytes.byteLength)throw Error('La geometría integrada de '+payload.name+' está incompleta.');
   const cpu={v:new Float32Array(bytes.buffer,bytes.byteOffset,vertexBytes/4),i:new Uint32Array(bytes.buffer,bytes.byteOffset+vertexBytes,indexCount)};
   for(const unit of payload.units){
    if(!Number.isSafeInteger(unit.offset)||!Number.isSafeInteger(unit.count)||unit.offset<0||unit.count<0||unit.offset%3||unit.count%3||unit.offset+unit.count>indexCount||!unit.hull?.length)throw Error('Un conjunto de '+payload.name+' contiene datos inválidos.');
   }
   const gpu=renderer.upload(cpu.v,cpu.i,8);
   payload.binary=null;
   const textures=[];
   for(const name of ['color','normal','rough']){
    if(typeof payload.textures[name]!=='string')throw Error('Falta la textura '+name+' de '+payload.name+'.');
    textures.push(await renderer.texture(payload.textures[name]));
    payload.textures[name]=null;
   }
   VILLAGES.push({id:payload.id,name:payload.name,shortName:payload.shortName,photo:payload.photo,units:payload.units,model:gpu,cpu,textures});
  }
  if(!VILLAGES.some(v=>v.id===state.villageId))state.villageId=VILLAGES[0].id;
  setupCamera();setupUI();generateEnvironment();placeVillage();fitCamera();
  // A successful initialization includes the first actual WebGL render.
  camera.update();renderer.render([...scene.environment,scene.grass,...scene.buildings],scene.overlay,camera,state.shadows);
  state.ready=true;dirty=false;updateLabels();
  window.__villageLab={version:'2.1',state,scene,camera,renderer,
   regenerate:()=>{generateEnvironment();placeVillage()},place:placeVillage,fit:fitCamera,activate:activateVillage,
   villages:VILLAGES.map(v=>({id:v.id,name:v.name,units:v.units.length})),
   check:()=>scene.buildings.map(b=>({name:b.unit.name,visible:b.visible,hits:b.hits.map(x=>x.name)}))};
  if($('loading'))$('loading').classList.add('finished');
  requestAnimationFrame(animate);
 }catch(e){
  state.ready=false;console.error(e);
  const loading=$('loading');
  if(loading){loading.classList.add('failed');loading.innerHTML='<div class="loaderbox"><h2>No se ha podido iniciar el visor</h2><p></p><button onclick="location.reload()">Reintentar</button></div>';loading.querySelector('p').textContent=e.message||String(e);}
 }
}

/* UI and placement inspector. The catalog is data-driven for subsequent villages. */
let regenTimer=null,placementTimer=null,toastTimer=null,modalReturnFocus=null;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800)}
function closeCatalog(){$('catalog').classList.remove('open');$('villageButton').setAttribute('aria-expanded','false')}
function closeModal(id){$(id).classList.remove('open');modalReturnFocus?.focus();modalReturnFocus=null}
function openModal(id){closeCatalog();modalReturnFocus=document.activeElement;$(id).classList.add('open');$(id).querySelector('button')?.focus()}
function togglePanel(){let open=document.body.classList.toggle('panel-open');$('mobilePeek').setAttribute('aria-expanded',String(open))}
function normalizeSettings(){state.seed=$('seed').value.trim()||'MAPU-1872';$('seed').value=state.seed;state.treeCount=Number($('trees').value);state.rockCount=Number($('rocks').value);state.angle=Number($('rotation').value);state.margin=Number($('margin').value)}
function updateOutputs(){$('treesValue').textContent=$('trees').value;$('rocksValue').textContent=$('rocks').value;$('rotationValue').textContent=$('rotation').value+'°';$('marginValue').textContent=Number($('margin').value).toFixed(2).replace('.',',')+' m'}
function regenerate(showNotice=true){
 clearTimeout(regenTimer);clearTimeout(placementTimer);normalizeSettings();updateOutputs();state.selection=null;generateEnvironment();placeVillage();if(showNotice)toast('Terreno generado · '+state.seed);
}
function newSeed(){const a=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(a);else a[0]=Date.now();$('seed').value='MAPU-'+(a[0]%999999).toString().padStart(6,'0');regenerate()}
function activateVillage(id){
 const v=VILLAGES.find(v=>v.id===id);if(!v)return;
 state.villageId=id;state.selection=null;
 // Rendering AND triangle picking must use the newly selected village.
 modelCPU=v.cpu;modelGPU=v.model;source=v;renderer.textures=v.textures;
 document.title='Poblados / LAB · '+v.shortName;
 scene.buildings=v.units.map(unit=>({...v.model,offset:unit.offset,count:unit.count,model:M.identity(),cast:true,visible:true,mode:1,unit}));
 for(const id of ['villagePhoto','peekPhoto','referenceImage']){$(id).src=v.photo;$(id).alt='Imagen de referencia de '+v.name;}
 $('villageName').textContent=v.shortName;$('peekName').textContent=v.shortName;
 $('sceneTitle').textContent=v.name;$('referenceTitle').textContent=v.name;
 $('villageMeta').textContent=v.units.length+' conjuntos independientes';
 for(const b of $('catalogOptions').children)b.setAttribute('aria-selected',String(b.dataset.id===v.id));
 closeCatalog();
 // Keep the seed, terrain, trees and rocks unchanged when switching.
 if(state.ready){placeVillage();fitCamera();}
}
function refreshUI(){
 const placed=scene.buildings.filter(b=>b.visible).length,total=scene.buildings.length,omitted=total-placed;
 $('placedCount').textContent=placed;$('omittedCount').textContent=omitted;$('obstacleCount').textContent=scene.obstacles.length;
 $('stageStatus').textContent=placed+' de '+total+' conjuntos colocados';$('seedBadge').textContent='· '+state.seed;$('peekStatus').textContent=placed+'/'+total+' colocados · '+omitted+' omitidos · Ajustes';
 $('statusText').textContent=omitted===0?'Poblado completo: todas las huellas están libres.':placed===0?'Todos los conjuntos están bloqueados. Reduce los obstáculos o cambia la semilla.':omitted+' '+(omitted===1?'conjunto omitido':'conjuntos omitidos')+' por colisión con el entorno.';
 $('legend').classList.toggle('visible',state.showFootprints);
 const list=$('reportList');list.replaceChildren();
 for(let b of scene.buildings){let item=document.createElement('button');item.type='button';item.className='reportUnit'+(b.unit.key===state.selection?' active':'');let dot=document.createElement('span');dot.className='dot'+(b.visible?'':' no');let name=document.createElement('span');name.textContent=b.unit.name;let reason=document.createElement('span');reason.className='reason';reason.textContent=b.visible?'Colocado':(b.hits.some(o=>o.kind==='Árbol')?'Árbol':'Roca')+(b.hits.length>1?' +'+(b.hits.length-1):'');item.title=b.visible?b.unit.name+' · colocado':b.unit.name+' · omitido por '+b.hits.map(o=>o.name).join(', ');item.append(dot,name,reason);item.addEventListener('click',()=>selectBuilding(b.unit.key));list.append(item)}refreshInspector();
}
function selectBuilding(key){state.selection=key;makeOverlay();refreshUI();dirty=true;closeCatalog();if(innerWidth<=650){document.body.classList.remove('panel-open');$('mobilePeek').setAttribute('aria-expanded','false')}}
function refreshInspector(){const b=scene.buildings.find(b=>b.unit.key===state.selection);$('inspector').classList.toggle('open',!!b);if(!b)return;$('inspectorType').textContent=b.unit.kind.toUpperCase();$('inspectorName').textContent=b.unit.name;$('inspectorStatus').textContent=b.visible?'Colocado · huella libre':'Omitido · colisión';$('inspectorStatus').className='statusBadge'+(b.visible?'':' no');$('inspectorReason').textContent=b.visible?'Este conjunto conserva su posición en la distribución original. No invade ningún árbol ni formación rocosa.':'No se ha colocado este conjunto. Obstáculos: '+b.hits.map(o=>o.name).join(', ')+'. El entorno se conserva intacto.'}
function focusSelection(){let b=scene.buildings.find(b=>b.unit.key===state.selection);if(!b)return;camera.target=[b.center[0],.8,b.center[1]];camera.distance=innerWidth<650?30:25;camera.pitch=.65;state.autoRotate=false;$('autoRotate').checked=false;dirty=true}
function updateLabels(){if($('compassNeedle'))$('compassNeedle').style.transform='rotate('+(-camera.yaw*180/Math.PI)+'deg)'}
function pickBuilding(clientX,clientY){
 if(!state.ready||document.querySelector('.modal.open'))return;
 const rect=renderer.canvas.getBoundingClientRect(),sx=(clientX-rect.left)/rect.width*2-1,sy=1-(clientY-rect.top)/rect.height*2;
 let forward=V.norm(V.sub(camera.target,camera.eye)),right=V.norm(V.cross(forward,[0,1,0])),up=V.cross(right,forward),tangent=Math.tan(Math.PI/9);
 let direction=V.norm(V.add(forward,V.add(V.mul(right,sx*tangent*rect.width/rect.height),V.mul(up,sy*tangent))));
 let angle=state.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),verts=modelCPU.v,inds=modelCPU.i;
 const rotate=v=>[(c*v[0]-s*v[2])/16,v[1]/16,(s*v[0]+c*v[2])/16];let dir=rotate(direction),best=Infinity,result=null;
 for(let b of scene.buildings){if(!b.visible)continue;let o=rotate(camera.eye);o[1]-=b.model[13]/16;let lo=b.unit.min,hi=b.unit.max,minT=0,maxT=Infinity;
  for(let k=0;k<3;k++){if(Math.abs(dir[k])<1e-9){if(o[k]<lo[k]||o[k]>hi[k])maxT=-1}else{let t1=(lo[k]-o[k])/dir[k],t2=(hi[k]-o[k])/dir[k];minT=Math.max(minT,Math.min(t1,t2));maxT=Math.min(maxT,Math.max(t1,t2))}}
  if(maxT<minT||minT>best)continue;
  // Exact Möller–Trumbore hit test against the original triangles; no bounding-box-only selection.
  for(let k=b.offset,end=b.offset+b.count;k<end;k+=3){
   let ia=inds[k]*8,ib=inds[k+1]*8,ic=inds[k+2]*8;
   let e1x=verts[ib]-verts[ia],e1y=verts[ib+1]-verts[ia+1],e1z=verts[ib+2]-verts[ia+2],e2x=verts[ic]-verts[ia],e2y=verts[ic+1]-verts[ia+1],e2z=verts[ic+2]-verts[ia+2];
   let px=dir[1]*e2z-dir[2]*e2y,py=dir[2]*e2x-dir[0]*e2z,pz=dir[0]*e2y-dir[1]*e2x,det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-12)continue;
   let inv=1/det,tx=o[0]-verts[ia],ty=o[1]-verts[ia+1],tz=o[2]-verts[ia+2],u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)continue;
   let qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,v=(dir[0]*qx+dir[1]*qy+dir[2]*qz)*inv;if(v<0||u+v>1)continue;
   let t=(e2x*qx+e2y*qy+e2z*qz)*inv;if(t>0&&t<best){best=t;result=b.unit.key}
  }
 }
 // Omitted entities have no mesh; in diagnostic mode their floor outlines are selectable.
 if(!result&&state.showFootprints&&direction[1]<-1e-5){let t=-camera.eye[1]/direction[1],p=V.add(camera.eye,V.mul(direction,t));let b=scene.buildings.find(b=>!b.visible&&circleHitsPolygon(p[0],p[2],0,b.hull));if(b)result=b.unit.key}
 if(result)selectBuilding(result);else if(state.selection){state.selection=null;makeOverlay();refreshUI();dirty=true}
}
function captureImage(){
 camera.update();renderer.render([...scene.environment,scene.grass,...scene.buildings],scene.overlay,camera,state.shadows);
 renderer.canvas.toBlob(blob=>{if(!blob){toast('No se ha podido crear la captura.');return}let link=document.createElement('a');let url=URL.createObjectURL(blob);link.href=url;let current=VILLAGES.find(v=>v.id===state.villageId);link.download='Poblado_'+(current?.shortName||'Escenario')+'_'+state.seed.replace(/[^a-zA-Z0-9_-]/g,'_')+'.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);toast('Captura del escenario preparada.')},'image/png');
}
function setupUI(){
 state.seed=$('seed').value;
 const options=$('catalogOptions');for(let v of VILLAGES){let b=document.createElement('button');b.type='button';b.className='catalogOption';b.dataset.id=v.id;b.setAttribute('role','option');b.setAttribute('aria-selected','true');let img=document.createElement('img');img.src=v.photo;img.alt=v.name;let label=document.createElement('div');let strong=document.createElement('strong');strong.textContent=v.shortName;let small=document.createElement('small');small.textContent=v.units.length+' conjuntos';label.append(strong,small);let check=document.createElement('span');check.className='checkmark';check.textContent='✓';b.append(img,label,check);b.addEventListener('click',()=>activateVillage(v.id));options.append(b)}activateVillage(state.villageId);
 $('villageButton').addEventListener('click',()=>{let open=$('catalog').classList.toggle('open');$('villageButton').setAttribute('aria-expanded',String(open));if(open)$('catalogOptions').querySelector('button')?.focus()});
 document.addEventListener('click',e=>{if(!e.target.closest('.selector'))closeCatalog()});
 $('mobilePeek').addEventListener('click',togglePanel);$('referenceButton').addEventListener('click',()=>openModal('referenceModal'));$('help').addEventListener('click',()=>openModal('helpModal'));$('bottomHelp').addEventListener('click',()=>openModal('helpModal'));
 for(const e of document.querySelectorAll('[data-close]'))e.addEventListener('click',()=>closeModal(e.dataset.close));for(const e of document.querySelectorAll('.modal'))e.addEventListener('click',evt=>{if(evt.target===e)closeModal(e.id)});
 document.addEventListener('keydown',e=>{let modal=document.querySelector('.modal.open');if(e.key==='Escape'){if(modal)closeModal(modal.id);closeCatalog()}if(e.key==='?'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))openModal('helpModal');if(e.key==='Tab'&&modal){let focusables=Array.from(modal.querySelectorAll('button,input,[tabindex="0"]'));let a=focusables[0],b=focusables.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus()}}});
 $('regenerate').addEventListener('click',()=>regenerate());$('randomSeed').addEventListener('click',newSeed);$('seed').addEventListener('keydown',e=>{if(e.key==='Enter')regenerate()});
 for(const id of ['trees','rocks'])$(id).addEventListener('input',()=>{updateOutputs();clearTimeout(regenTimer);regenTimer=setTimeout(()=>regenerate(false),110)});
 for(const id of ['rotation','margin'])$(id).addEventListener('input',()=>{updateOutputs();clearTimeout(placementTimer);placementTimer=setTimeout(()=>{state.angle=Number($('rotation').value);state.margin=Number($('margin').value);placeVillage()},70)});
 $('footprints').addEventListener('change',()=>{state.showFootprints=$('footprints').checked;makeOverlay();refreshUI();dirty=true});$('shadows').addEventListener('change',()=>{state.shadows=$('shadows').checked;dirty=true});$('autoRotate').addEventListener('change',()=>{state.autoRotate=$('autoRotate').checked;dirty=true});
 for(let[id,kind]of[['focusView','village'],['terrainView','terrain'],['topView','top']])$(id).addEventListener('click',()=>{fitCamera(kind);state.autoRotate=false;$('autoRotate').checked=false});
 $('closeInspector').addEventListener('click',()=>{state.selection=null;makeOverlay();refreshUI();dirty=true});$('focusSelection').addEventListener('click',focusSelection);$('capture').addEventListener('click',captureImage);
 $('fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement){if(!document.documentElement.requestFullscreen){toast('Este navegador no permite pantalla completa.');return}await document.documentElement.requestFullscreen()}else await document.exitFullscreen();dirty=true}catch(e){toast('El navegador ha bloqueado el modo de pantalla completa.')}});
 renderer.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();state.ready=false;toast('Se ha perdido el contexto gráfico. Recuperando el visor…')});renderer.canvas.addEventListener('webglcontextrestored',()=>location.reload());
 updateOutputs();
}

initialize();
