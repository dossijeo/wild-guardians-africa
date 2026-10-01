/* BASTIÓN — compact native WebGL2 renderer. No external dependencies.
 * V2: baked axis correction + physically removed display plinths.
 * Opaque regional dual-topology morph inspired by BIOMA / Cultivos V3.
 * Original UVs are preserved; absent faces have zero area. No dither/alpha pass.
 */
'use strict';
const M4={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;},
 ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);},
 lookAt(eye,target,up=[0,1,0]){const z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);},
 inverse(a){const aug=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?a[c*4+r]:+(c-4===r)));for(let c=0;c<4;c++){let p=c;for(let r=c+1;r<4;r++)if(Math.abs(aug[r][c])>Math.abs(aug[p][c]))p=r;if(Math.abs(aug[p][c])<1e-12)return M4.identity();[aug[c],aug[p]]=[aug[p],aug[c]];let d=aug[c][c];for(let j=0;j<8;j++)aug[c][j]/=d;for(let r=0;r<4;r++)if(r!==c){let q=aug[r][c];for(let j=0;j<8;j++)aug[r][j]-=q*aug[c][j];}}return new Float32Array(Array.from({length:16},(_,i)=>aug[i%4][4+Math.floor(i/4)]));},
 point(m,p,w=1){let q=[0,0,0,0];for(let r=0;r<4;r++)q[r]=m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]*w;return q.slice(0,3).map(x=>x/(q[3]||1));},
 model(p){const a=p.angle||0,c=Math.cos(a),s=Math.sin(a),sx=p.scaleX||1,sy=p.scaleY||1,sz=p.scaleZ||1;return new Float32Array([c*sx,0,s*sx,0,0,sy,0,0,-s*sz,0,c*sz,0,p.x,p.y||0,p.z,1]);}
};
const V={sub:(a,b)=>a.map((x,i)=>x-b[i]),add:(a,b)=>a.map((x,i)=>x+b[i]),mul:(a,s)=>a.map(x=>x*s),dot:(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm(a){return V.mul(a,1/(Math.hypot(...a)||1));}};
function decodeArray(s,Type){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Type(u.buffer);}
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,vs,fs){const p=gl.createProgram();const v=shader(gl,gl.VERTEX_SHADER,vs),f=shader(gl,gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
// CPU and GPU use exactly the same regional interpolation (including picking).
function regionalEase(t){t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);}
const MORPH_VS=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;
layout(location=1)in vec3 aRoot;
layout(location=2)in vec3 aNormal;
layout(location=3)in vec3 aPeer;
layout(location=4)in vec2 aUV;
layout(location=5)in vec3 aTarget;layout(location=6)in vec3 aTargetNormal;
uniform mat4 uVP,uModel,uLightVP;uniform float uMorph;
out vec3 vWorld,vNormal;out vec2 vUV;out vec4 vLight;
float ease(float t){t=clamp(t,0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
void main(){
 float t=ease(uMorph),weight=sqrt(max(0.,1.-ease((t-.5)*2.)));
 // Keep fitted surfaces continuous while the other topology unfolds. Only the
 // retiring regional shell contracts once its replacement already covers it.
 vec3 pivot=mix(aRoot,aPeer,t),fitted=mix(aPosition,aTarget,t);
 vec3 p=pivot+(fitted-pivot)*weight;
 vec4 world=uModel*vec4(p,1.);vWorld=world.xyz;
 vec3 nn=mix(aNormal,aTargetNormal,t);if(dot(nn,nn)<.0001)nn=aNormal;vNormal=normalize(transpose(inverse(mat3(uModel)))*nn);
 vUV=aUV;vLight=uLightVP*world;gl_Position=uVP*world;
}`;
const MORPH_FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vWorld,vNormal;in vec2 vUV;in vec4 vLight;
uniform sampler2D uTexture;uniform sampler2DShadow uShadow;
uniform float uFlash,uSelected;uniform bool uShadows;out vec4 outColor;
float shadow(vec3 n){if(!uShadows)return 1.;vec3 p=vLight.xyz/vLight.w*.5+.5;if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.))))return 1.;float b=max(.0005,.0018*(1.-dot(n,normalize(vec3(-22.,40.,18.)))));float s=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)s+=texture(uShadow,vec3(p.xy+vec2(x,y)/1536.,p.z-b));return .43+.57*s/9.;}
void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 tex=texture(uTexture,vUV).rgb;vec3 lin=pow(max(tex,vec3(.001)),vec3(2.2));float dif=max(dot(n,normalize(vec3(-22.,40.,18.))),0.);vec3 col=lin*(.66+.14*n.y+dif*.86*shadow(n));col=mix(col,vec3(.81,.39,.12),uFlash*.52);col+=vec3(.07,.095,.055)*uSelected;col=1.-exp(-col*1.35);outColor=vec4(pow(col,vec3(1./2.2)),1.);}`;
const DEPTH_FS=`#version 300 es
precision highp float;
void main(){}`;
const GROUND_VS=`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;uniform mat4 uVP,uLightVP;out vec3 vWorld;out vec4 vLight;
void main(){vWorld=aPos;vLight=uLightVP*vec4(aPos,1.);gl_Position=uVP*vec4(aPos,1.);}`;
const GROUND_FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vWorld;in vec4 vLight;uniform sampler2DShadow uShadow;uniform bool uGrid,uShadows;out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 x=vWorld.xz;float n=n2(x*.27)*.5+n2(x*2.3)*.24+n2(x*37.)*.055;vec3 c=mix(vec3(.806,.755,.653),vec3(.893,.853,.759),n);float border=1.-smoothstep(22.9,23.1,max(abs(x.x),abs(x.y)));c=mix(c*.96,c,border);if(uGrid){vec2 q=x/2.;vec2 grid=abs(fract(q-.5)-.5)/fwidth(q);float line=1.-min(min(grid.x,grid.y),1.);c=mix(c,vec3(.47,.47,.38),line*.13*border);vec2 big=abs(fract(x/10.-.5)-.5)/fwidth(x/10.);float bl=1.-min(min(big.x,big.y),1.);c=mix(c,vec3(.5,.48,.40),bl*.11*border);}vec3 lp=vLight.xyz/vLight.w*.5+.5;float s=1.;if(uShadows&&all(greaterThan(lp,vec3(0.)))&&all(lessThan(lp,vec3(1.)))){s=0.;for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++)s+=texture(uShadow,vec3(lp.xy+vec2(i,j)/1536.,lp.z-.0008));s/=25.;}c*=mix(.68,1.,s);float fade=smoothstep(22.,67.,length(x));c=mix(c,vec3(.92,.903,.865),fade*.5);outColor=vec4(c,1.);}`;
class BastionRenderer{
 constructor(canvas,raw){
  this.canvas=canvas;const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!gl)throw Error('Este navegador no ofrece WebGL2. Abre el archivo en un navegador con aceleración gráfica.');this.gl=gl;this.cache=new Map();this.assets={};
  for(const [key,r]of Object.entries(raw.pieces)){this.assets[key]={p:decodeArray(r.p,Float32Array),n:decodeArray(r.n,Float32Array),uv:decodeArray(r.uv,Float32Array),i:decodeArray(r.i,Uint16Array),bounds:r.bounds,regions:r.regions,faceRegions:decodeArray(r.faceRegions,Uint16Array),morph:r.morph};}
  this.main=program(gl,MORPH_VS,MORPH_FS);this.depth=program(gl,MORPH_VS,DEPTH_FS);this.ground=program(gl,GROUND_VS,GROUND_FS);this.uniforms=new Map();
  this.camera={theta:.27,elev:.88,size:12.5,x:0,z:0,top:false};this.lightVP=M4.multiply(M4.ortho(-34,34,-34,34,.1,110),M4.lookAt([-22,40,18],[0,0,0]));
  this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([170,135,88,255]));
  this.ready=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const an=gl.getExtension('EXT_texture_filter_anisotropic');if(an)gl.texParameterf(gl.TEXTURE_2D,an.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));resolve();};im.onerror=()=>reject(Error('No se pudo decodificar la textura integrada.'));im.src=raw.texture;});
  this.shadowSize=1536;this.shadow=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadow);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  this.fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadow,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  this.groundVAO=gl.createVertexArray();gl.bindVertexArray(this.groundVAO);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-80,0,-80,80,0,-80,-80,0,80,-80,0,80,80,0,-80,80,0,80]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);this.resize();
 }
 u(p,name){let m=this.uniforms.get(p);if(!m){m={};this.uniforms.set(p,m);}if(!(name in m))m[name]=this.gl.getUniformLocation(p,name);return m[name];}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.75);this.width=r.width;this.height=r.height;const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.updateCamera();}
 updateCamera(){const c=this.camera,e=c.top?1.565:c.elev,eye=[c.x+Math.sin(c.theta)*45*Math.cos(e),45*Math.sin(e),c.z+Math.cos(c.theta)*45*Math.cos(e)];this.eye=eye;this.view=M4.lookAt(eye,[c.x,0,c.z]);let aspect=this.width/Math.max(1,this.height);this.vp=M4.multiply(M4.ortho(-c.size*aspect,c.size*aspect,-c.size,c.size,.1,150),this.view);this.invVP=M4.inverse(this.vp);}
 project(p){const q=M4.point(this.vp,p);return [(q[0]*.5+.5)*this.width,(-q[1]*.5+.5)*this.height,q[2]];}
 ray(x,y){const nx=x/this.width*2-1,ny=1-y/this.height*2;const a=M4.point(this.invVP,[nx,ny,-1]),b=M4.point(this.invVP,[nx,ny,1]);return{origin:a,dir:V.norm(V.sub(b,a))};}
 groundAt(x,y){const r=this.ray(x,y),t=-r.origin[1]/r.dir[1];return t>=0?V.add(r.origin,V.mul(r.dir,t)):null;}
 getVAO(key,dest){
  const name=key+'>'+String(dest||'');if(this.cache.has(name))return this.cache.get(name);
  const gl=this.gl,a=this.assets[key];if(!a)throw Error('Malla inexistente: '+key);
  const bridge=dest?a.morph[dest]:null;if(dest&&!bridge)throw Error('Puente inexistente: '+name);
  // Each triangle has ONE region. Adjacent triangles in that region share the
  // same pivot; absent triangles collapse to zero area, never to screen noise.
  const count=a.i.length,pos=new Float32Array(count*3),normal=new Float32Array(count*3),uv=new Float32Array(count*2),roots=new Float32Array(count*3),peers=new Float32Array(count*3),targets=new Float32Array(count*3),targetNormals=new Float32Array(count*3);
  if(bridge&&!bridge.positions){bridge.positions=decodeArray(bridge.p,Float32Array);bridge.normals=decodeArray(bridge.n,Float32Array);}
  for(let face=0;face<count/3;face++){
   const region=a.faceRegions[face],root=dest?a.regions[region].root:[0,0,0],peer=dest?bridge.peers[region]:root;
   for(let j=0;j<3;j++){
    const at=face*3+j,vi=a.i[at];pos.set(a.p.subarray(vi*3,vi*3+3),at*3);normal.set(a.n.subarray(vi*3,vi*3+3),at*3);uv.set(a.uv.subarray(vi*2,vi*2+2),at*2);roots.set(root,at*3);peers.set(peer,at*3);targets.set((bridge?bridge.positions:a.p).subarray(vi*3,vi*3+3),at*3);targetNormals.set((bridge?bridge.normals:a.n).subarray(vi*3,vi*3+3),at*3);
   }
  }
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  for(const [loc,data,size]of [[0,pos,3],[1,roots,3],[2,normal,3],[3,peers,3],[4,uv,2],[5,targets,3],[6,targetNormals,3]]){
   const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);
  }
  gl.bindVertexArray(null);const result={vao,count,pos,roots,peers,targets,lastMorph:NaN,morphed:null};this.cache.set(name,result);return result;
 }
 stages(p){
  if(p.asset)return[{key:p.asset,dest:null,morph:0}];
  const d=1-Math.max(0,Math.min(1,p.visual??p.hp/p.maxHp));let a,b,t;
  if(p.kind==='gate'){a='puerta';b='destruido';t=d;}
  else if(d<=.5){a='intacto';b='danado';t=d*2;}
  else{a='danado';b='destruido';t=d*2-1;}
  const ka=p.material+'_'+a,kb=p.material+'_'+b;
  if(t<=0)return[{key:ka,dest:null,morph:0}];
  if(t>=1)return[{key:kb,dest:null,morph:0}];
  return[{key:ka,dest:kb,morph:t,role:0},{key:kb,dest:ka,morph:1-t,role:1}];
 }
 drawPieces(program,pieces,selected){
  const gl=this.gl;
  for(const p of pieces){
   gl.uniformMatrix4fv(this.u(program,'uModel'),false,M4.model(p));gl.uniform1f(this.u(program,'uFlash'),p.flash||0);gl.uniform1f(this.u(program,'uSelected'),p.id===selected?1:0);
   for(const stage of this.stages(p)){
    const mesh=this.getVAO(stage.key,stage.dest);gl.bindVertexArray(mesh.vao);gl.uniform1f(this.u(program,'uMorph'),stage.morph);if(stage.role===1){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-1);}else gl.disable(gl.POLYGON_OFFSET_FILL);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
   }
  }
  gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindVertexArray(null);
 }
 render(pieces,selected,{grid=true,shadows=true}={}){const gl=this.gl;shadows=shadows&&this.shadowOK;gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);if(shadows){gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.viewport(0,0,this.shadowSize,this.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.depth);gl.uniformMatrix4fv(this.u(this.depth,'uVP'),false,this.lightVP);gl.uniformMatrix4fv(this.u(this.depth,'uLightVP'),false,this.lightVP);this.drawPieces(this.depth,pieces,selected);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.91,.884,.83,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shadow);gl.useProgram(this.ground);gl.uniformMatrix4fv(this.u(this.ground,'uVP'),false,this.vp);gl.uniformMatrix4fv(this.u(this.ground,'uLightVP'),false,this.lightVP);gl.uniform1i(this.u(this.ground,'uGrid'),+grid);gl.uniform1i(this.u(this.ground,'uShadows'),+shadows);gl.uniform1i(this.u(this.ground,'uShadow'),1);gl.bindVertexArray(this.groundVAO);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.useProgram(this.main);gl.uniformMatrix4fv(this.u(this.main,'uVP'),false,this.vp);gl.uniformMatrix4fv(this.u(this.main,'uLightVP'),false,this.lightVP);gl.uniform1i(this.u(this.main,'uShadows'),+shadows);gl.uniform1i(this.u(this.main,'uTexture'),0);gl.uniform1i(this.u(this.main,'uShadow'),1);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);this.drawPieces(this.main,pieces,selected);
 }
 morphedPositions(mesh,morph){
  if(morph===0)return mesh.pos;
  if(mesh.lastMorph===morph&&mesh.morphed)return mesh.morphed;
  const t=regionalEase(morph),scale=Math.sqrt(Math.max(0,1-regionalEase((t-.5)*2)));
  const out=mesh.morphed||new Float32Array(mesh.pos.length);
  for(let k=0;k<out.length;k++){const pivot=mesh.roots[k]+(mesh.peers[k]-mesh.roots[k])*t,fitted=mesh.pos[k]+(mesh.targets[k]-mesh.pos[k])*t;out[k]=pivot+(fitted-pivot)*scale;}
  mesh.lastMorph=morph;mesh.morphed=out;return out;
 }
 pick(x,y,pieces,touch=false){
  const ray=this.ray(x,y);let best=null,bestT=Infinity;
  for(const p of pieces){
   const co=Math.cos(p.angle||0),si=Math.sin(p.angle||0),sx=p.scaleX||1,sy=p.scaleY||1,sz=p.scaleZ||1;
   const dx=ray.origin[0]-p.x,dy=ray.origin[1]-(p.y||0),dz=ray.origin[2]-p.z;
   const ro=[(dx*co+dz*si)/sx,dy/sy,(-dx*si+dz*co)/sz];
   const rd=[(ray.dir[0]*co+ray.dir[2]*si)/sx,ray.dir[1]/sy,(-ray.dir[0]*si+ray.dir[2]*co)/sz];
   const stages=this.stages(p),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(const st of stages)for(const key of [st.key,st.dest].filter(Boolean)){
    const bounds=this.assets[key].bounds;for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],bounds[0][j]-.35);hi[j]=Math.max(hi[j],bounds[1][j]+.35);}
   }
   let near=0,far=bestT;
   for(let j=0;j<3;j++){
    if(Math.abs(rd[j])<1e-10){if(ro[j]<lo[j]||ro[j]>hi[j]){near=Infinity;break;}}
    else{let a=(lo[j]-ro[j])/rd[j],b=(hi[j]-ro[j])/rd[j];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);}
   }
   if(near>far)continue;
   for(const st of stages){
    const mesh=this.getVAO(st.key,st.dest),v=this.morphedPositions(mesh,st.morph);
    for(let k=0;k<v.length;k+=9){
     const ax=v[k],ay=v[k+1],az=v[k+2],e1x=v[k+3]-ax,e1y=v[k+4]-ay,e1z=v[k+5]-az,e2x=v[k+6]-ax,e2y=v[k+7]-ay,e2z=v[k+8]-az;
     const hx=rd[1]*e2z-rd[2]*e2y,hy=rd[2]*e2x-rd[0]*e2z,hz=rd[0]*e2y-rd[1]*e2x,det=e1x*hx+e1y*hy+e1z*hz;if(Math.abs(det)<1e-10)continue;
     const tx=ro[0]-ax,ty=ro[1]-ay,tz=ro[2]-az,u=(tx*hx+ty*hy+tz*hz)/det;if(u<0||u>1)continue;
     const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,vv=(rd[0]*qx+rd[1]*qy+rd[2]*qz)/det;if(vv<0||u+vv>1)continue;
     const t=(e2x*qx+e2y*qy+e2z*qz)/det;if(t>=0&&t<bestT){bestT=t;best=p;}
    }
   }
  }
  if(best)return best;
  let tolerance=touch?28:12;
  for(const p of pieces){const q=this.project([p.x,p.hp===0?.15:.65,p.z]),distance=Math.hypot(q[0]-x,q[1]-y);if(distance<tolerance){tolerance=distance;best=p;}}
  return best;
 }

}
