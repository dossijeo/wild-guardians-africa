// QA-only prototype: keep the existing screen rendering/color pipeline intact.
// Capture its pixels, reuse native depth recipes, then blur distant geometry.
import * as THREE from 'three';
export function installHorizonDepthBlur(world,{depthMode='capture'}={}){
 const r=world.renderer,size=new THREE.Vector2(),scene=new THREE.Scene(),camera=new THREE.Camera();
 let color=null,width=0,height=0,closed=false;
 const copyDepth=depthMode==='copy-packed'?new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:true,depthTexture:new THREE.DepthTexture(1,1,THREE.UnsignedInt248Type)}):null;
 if(copyDepth)copyDepth.depthTexture.format=THREE.DepthStencilFormat;
 const uniforms={colorMap:{value:null},depthMap:{value:null},pixel:{value:new THREE.Vector2()},nearFar:{value:new THREE.Vector2()},focus:{value:new THREE.Vector2(45,140)},radius:{value:2.5},debug:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
varying vec2 vUv;uniform sampler2D colorMap,depthMap;uniform vec2 pixel,nearFar,focus;uniform float radius,debug;
float distanceAt(float d){return nearFar.x*nearFar.y/(nearFar.y-d*(nearFar.y-nearFar.x));}
void main(){
 vec4 original=texture2D(colorMap,vUv);float depth=texture2D(depthMap,vUv).r;
 // Empty depth belongs to the sky, not to far geometry. Never blur it.
 if(depth>=.999999){gl_FragColor=debug>1.5?vec4(1.):debug>.5?vec4(0.,0.,0.,1.):original;return;}
 if(debug>1.5){gl_FragColor=vec4(0.,0.,0.,1.);return;}
 float z=distanceAt(depth),amount=smoothstep(focus.x,focus.y,z);
 if(debug>.5){gl_FragColor=vec4(vec3(amount),1.);return;}
 if(amount<.001){gl_FragColor=original;return;}
 vec3 sum=original.rgb*4.;float weight=4.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  if(x==0&&y==0)continue;
  vec2 uv=clamp(vUv+vec2(float(x),float(y))*pixel*radius*amount,pixel*.5,vec2(1.)-pixel*.5);
  float d=texture2D(depthMap,uv).r;
  // Exclude sky and closer silhouettes to prevent sky halos/foreground smears.
  float w=(1.-step(.999999,d))*smoothstep(z*.80,z*.98,distanceAt(d));
  sum+=texture2D(colorMap,uv).rgb*w;weight+=w;
 }
 gl_FragColor=vec4(mix(original.rgb,sum/weight,amount),original.a);
}`});
 const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
 const original=world.drawWorldFrame;
 const api={depthMode,enabled:true,uniforms,stats:{frames:0,textureBytes:0},dispose(){if(closed)return;closed=true;if(world.drawWorldFrame===draw)world.drawWorldFrame=original;color?.dispose();copyDepth?.dispose();geometry.dispose();material.dispose();}};
 function draw(...args){const result=original.apply(this,args);if(closed||!api.enabled)return result;
  r.getDrawingBufferSize(size);if(size.x!==width||size.y!==height){color?.dispose();width=size.x;height=size.y;color=new THREE.FramebufferTexture(width,height);color.minFilter=color.magFilter=THREE.LinearFilter;color.colorSpace=THREE.NoColorSpace;uniforms.colorMap.value=color;uniforms.pixel.value.set(1/width,1/height);api.stats.textureBytes=width*height*4;}
  // No promise can make this extra depth pass free: benchmark it explicitly.
  const gl=r.getContext(),audit=api.auditNext===true;api.auditNext=false;const read=()=>{const a=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};const before=audit?read():null;
  r.copyFramebufferToTexture(color);if(depthMode.startsWith('copy')){
   const previous=r.getRenderTarget(),target=copyDepth??world.destructionPass.smokeDepth;
   if(previous)throw Error('Depth-copy pilot requires the screen framebuffer');
   if(target.width!==width||target.height!==height)target.setSize(width,height);
   r.setRenderTarget(target);const readBinding=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
   try{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,width,height,0,0,width,height,gl.DEPTH_BUFFER_BIT,gl.NEAREST);}
   finally{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,readBinding);r.setRenderTarget(previous);}
  }else world.destructionPass.captureDepth(world.camera,world.scene);
  uniforms.depthMap.value=(copyDepth??world.destructionPass.smokeDepth).depthTexture;uniforms.nearFar.value.set(world.camera.near,world.camera.far);
  const clear=r.autoClear,shadows=r.shadowMap.enabled;try{r.autoClear=false;r.shadowMap.enabled=false;r.render(scene,camera);if(audit){const after=read(),previous=uniforms.debug.value;uniforms.debug.value=2;r.render(scene,camera);const mask=read();uniforms.debug.value=previous;r.render(scene,camera);let skyPixels=0,changed=0,maxDelta=0;for(let i=0;i<mask.length;i+=4)if(mask[i]===255){skyPixels++;const delta=Math.max(...[0,1,2].map(c=>Math.abs(before[i+c]-after[i+c])));maxDelta=Math.max(maxDelta,delta);if(delta>0)changed++;}api.stats.skyAudit={skyPixels,changed,maxDelta,scope:'Same-frame raw RGB readback of empty-depth pixels before/after the filter; auditing excluded from benchmarks'};}}finally{r.autoClear=clear;r.shadowMap.enabled=shadows;}
  api.stats.frames++;return result;
 }
 world.drawWorldFrame=draw;return api;
}
