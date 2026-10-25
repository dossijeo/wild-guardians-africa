import * as THREE from 'three';

// Screen-space distant-world focus. The sky has empty depth and is never sampled
// into neighboring geometry. All resources remain owned by Three.
export const HORIZON_FOCUS_FRAGMENT=`varying vec2 vUv;uniform sampler2D colorMap,depthMap;uniform vec2 pixel,nearFar,focus;uniform float radius;
float distanceAt(float d){return nearFar.x*nearFar.y/(nearFar.y-d*(nearFar.y-nearFar.x));}
void main(){
 float depth=texture2D(depthMap,vUv).r;
 // Empty depth belongs to the sky, not to far geometry. Never blur it.
 if(depth>=.999999)discard;

 float z=distanceAt(depth),amount=smoothstep(focus.x,focus.y,z);

 if(amount<.001)discard;vec4 original=texture2D(colorMap,vUv);
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
}`;

export class HorizonFocus {
 constructor(renderer){
  this.renderer=renderer;this.generation=0;this.enabled=false;this.ready=false;this.disposed=false;this.size=new THREE.Vector2();
  this.stats={frames:0,bytes:0,disabledReason:null};this.target=null;
  this.uniforms={colorMap:{value:null},depthMap:{value:null},pixel:{value:new THREE.Vector2()},nearFar:{value:new THREE.Vector2()},focus:{value:new THREE.Vector2(45,140)},radius:{value:2.5}};
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.geometry=new THREE.PlaneGeometry(2,2);
  this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:HORIZON_FOCUS_FRAGMENT});
  this.scene.add(new THREE.Mesh(this.geometry,this.material));
 }
 configure({enabled,quality,biome}){
  const next=enabled&&['media','alta'].includes(quality);
  if(next!==this.enabled){this.generation++;this.preparing=null;}this.enabled=next;
  this.uniforms.radius.value=['desierto','gran-canon'].includes(biome)?1.5:2.5;
  if(!this.enabled){this.target?.dispose();this.target=null;this.stats.bytes=0;}
 }
 reset(){this.generation++;this.preparing=null;this.target?.dispose();this.target=null;this.ready=false;this.stats.bytes=0;this.stats.disabledReason=null;}
 async prepare(){
  if(!this.enabled||this.disposed||this.stats.disabledReason)return;
  if(this.ready){this.allocate();this.renderer.initRenderTarget(this.target);return;}
  if(this.preparing)return this.preparing;
  const version=this.generation;
  const pending=Promise.resolve().then(()=>this.renderer.compileAsync(this.scene,this.camera)).then(()=>{
   if(this.disposed||version!==this.generation||!this.enabled)return;
   this.allocate();this.renderer.initRenderTarget(this.target);this.ready=true;
  }).catch(error=>{if(!this.disposed&&version===this.generation)this.stats.disabledReason=String(error);}).finally(()=>{if(this.preparing===pending)this.preparing=null;});
  this.preparing=pending;return pending;
 }

 allocate(){
  const r=this.renderer;r.getDrawingBufferSize(this.size);const width=this.size.x,height=this.size.y;
  if(this.target?.width===width&&this.target?.height===height)return;
  this.target?.dispose();
  const depthTexture=new THREE.DepthTexture(width,height,THREE.UnsignedInt248Type);depthTexture.format=THREE.DepthStencilFormat;
  this.target=new THREE.WebGLRenderTarget(width,height,{depthBuffer:true,stencilBuffer:true,depthTexture,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  this.target.texture.colorSpace=THREE.NoColorSpace;
  this.uniforms.colorMap.value=this.target.texture;this.uniforms.depthMap.value=depthTexture;this.uniforms.pixel.value.set(1/width,1/height);
  this.stats.bytes=width*height*8;this.checkCopy=true;
 }
 render(camera,focusDistance){
  if(!this.enabled||!this.ready||this.disposed||this.stats.disabledReason)return;
  const r=this.renderer,gl=r.getContext();if(gl.isContextLost()||r.getRenderTarget())return;
  this.allocate();const {width,height}=this.target;
  r.setRenderTarget(this.target);const read=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
  try{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,width,height,0,0,width,height,gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT,gl.NEAREST);}
  finally{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,read);r.setRenderTarget(null);}
  // Validate only on allocation/context changes. Unsupported default framebuffer
  // formats leave the already drawn scene intact, without a repeated slow fallback.
  if(this.checkCopy){this.checkCopy=false;const error=gl.getError();if(error){this.stats.disabledReason='Depth copy unsupported: '+error;this.target.dispose();this.target=null;this.stats.bytes=0;return;}}
  const start=Math.max(45,focusDistance*1.5);this.uniforms.focus.value.set(start,Math.max(140,start+70));
  this.uniforms.nearFar.value.set(camera.near,camera.far);
  const clear=r.autoClear,shadows=r.shadowMap.enabled;
  try{r.autoClear=false;r.shadowMap.enabled=false;r.render(this.scene,this.camera);}
  finally{r.autoClear=clear;r.shadowMap.enabled=shadows;}
  this.stats.frames++;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.target?.dispose();this.geometry.dispose();this.material.dispose();this.target=null;this.stats.bytes=0;}
}
