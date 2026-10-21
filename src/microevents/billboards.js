import {Group,Mesh,InstancedBufferGeometry,BufferAttribute,InstancedInterleavedBuffer,InterleavedBufferAttribute,ShaderMaterial,TextureLoader,SRGBColorSpace,DoubleSide,DynamicDrawUsage,Color,Vector3} from 'three';
import {FEEDBACK_SPRITES} from './feedback.js';
import {MICROEVENT_ATLAS} from './definitions.js';
import {assetUrl} from '../rendering/asset-url.js';
export const billboardVertex=`
attribute vec3 aCenter;attribute vec3 aSizeRotation;attribute vec4 aAtlas;attribute vec4 aTint;attribute float aMode;
varying vec2 vUv;varying vec2 vLocal;varying vec4 vTint;varying float vMode;
void main(){vUv=aAtlas.xy+(position.xy+.5)*aAtlas.zw;vLocal=position.xy*2.;vTint=aTint;vMode=aMode;
 vec2 corner=position.xy*aSizeRotation.xy;float c=cos(aSizeRotation.z),s=sin(aSizeRotation.z);
 vec4 center=modelViewMatrix*vec4(aCenter,1.);center.xy+=mat2(c,s,-s,c)*corner;
 gl_Position=projectionMatrix*center;}`;
export const billboardFragment=`
uniform sampler2D uAtlas;uniform float uLight;varying vec2 vUv;varying vec2 vLocal;varying vec4 vTint;varying float vMode;
void main(){vec4 texel=texture2D(uAtlas,vUv);if(vMode>.5)texel=vec4(vec3(1.),pow(max(0.,1.-length(vLocal)),2.));
 float alpha=texel.a*vTint.a;if(alpha<.015)discard;gl_FragColor=vec4(texel.rgb*vTint.rgb*(vMode>.5?1.:uLight),alpha);
 #include <colorspace_fragment>
}`;
// A single instanced, depth-tested world mesh. No extra canvas, renderer or DOM particles.
export class MicroeventBillboards {
 constructor(world,{capacity=160,texture}={}){
  this.world=world;this.capacity=capacity;this.center=new Vector3();this.color=new Color();this.glow=new Color();this.count=0;
  const geometry=new InstancedBufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0]),3));
  this.buffer=new InstancedInterleavedBuffer(new Float32Array(capacity*15),15);this.buffer.setUsage(DynamicDrawUsage);
  for(const [name,size,offset] of [['aCenter',3,0],['aSizeRotation',3,3],['aAtlas',4,6],['aTint',4,10],['aMode',1,14]])geometry.setAttribute(name,new InterleavedBufferAttribute(this.buffer,size,offset));
  geometry.instanceCount=0;
  this.material=new ShaderMaterial({uniforms:{uAtlas:{value:texture??null},uLight:{value:1}},vertexShader:billboardVertex,fragmentShader:billboardFragment,transparent:true,depthTest:true,depthWrite:false,side:DoubleSide,toneMapped:false});
  this.mesh=new Mesh(geometry,this.material);this.mesh.name='microevent-world-billboards';this.mesh.frustumCulled=false;this.mesh.raycast=()=>{};
  this.root=new Group();this.root.name='microevent-world';this.root.userData.materialRegistryExcluded=true;this.root.add(this.mesh);this.root.visible=false;world.scene.add(this.root);
  this.ready=(texture?Promise.resolve(texture):new TextureLoader().loadAsync(assetUrl(MICROEVENT_ATLAS.url))).then(atlas=>{if(this.disposed){atlas.dispose();return;}atlas.colorSpace=SRGBColorSpace;this.texture=atlas;this.material.uniforms.uAtlas.value=atlas;});
 }
 emit(space,x,y,size,sx,sy,alpha,rotation=0,phase=0,{lift=0,mode=0,tint=null,height=size}={}){
  if(this.count>=this.capacity||alpha<=.005)return;
  const array=this.buffer.array,o=this.count++*15;space.offset(x,y,phase,this.center);array[o]=this.center.x;array[o+1]=this.center.y+lift;array[o+2]=this.center.z;array[o+3]=size*space.unit;array[o+4]=height*space.unit;array[o+5]=rotation;
  array[o+6]=(sx+.5)/MICROEVENT_ATLAS.width;array[o+7]=1-(sy+63.5)/MICROEVENT_ATLAS.height;array[o+8]=63/MICROEVENT_ATLAS.width;array[o+9]=63/MICROEVENT_ATLAS.height;
  array[o+10]=tint?.r??1;array[o+11]=tint?.g??1;array[o+12]=tint?.b??1;array[o+13]=alpha;array[o+14]=mode;
 }
 draw(particles,space,{ending=0,outcome=null,reducedMotion=false}={}){
  const def=particles.def,t=particles.time,hint=!reducedMotion&&!particles.engaged&&!particles.learned&&t>2.3&&t<4?1+.035*Math.sin((t-2.3)*8):1,fade=Math.min(1,t/.25)*(ending?Math.max(0,1-ending/.55):Math.min(1,(def.lifetime-t)/.45));this.count=0;
  space.origin(this.root.position);this.material.uniforms.uLight.value=def.glow?1:this.world.state?.time>=300?.68:1;
  if(def.objective==='gather'){const target=def.targetSprite??{x:128,y:128,size:24};this.emit(space,0,0,target.size,target.x,target.y,fade*.65);}
  if(def.glow)this.glow.set(def.glow[0]);
  for(let order=0;order<particles.count;order++){
   const i=def.behavior.chain?particles.count-1-order:order,p=particles.pool[i];let size=p.size*hint*(1+(def.pulse??0)*Math.sin(t*3+p.phase)),alpha=fade*(def.opacity??1)*p.reveal,lift=def.behavior.pull?p.progress*space.unit*25:0;
   if(def.behavior.absorb){size*=1-p.progress*.65;alpha*=1-p.progress*.8;}else alpha*=1-p.progress*.8;
   if(def.secondary?.kind==='mound'){const s=def.secondary;this.emit(space,p.homeX,p.homeY,s.size,s.spriteOffset,s.spriteY,fade*(1-p.progress)*.85,0,0);}
   if(def.glow){alpha*=.7+.3*Math.sin(t*3+p.phase);this.emit(space,p.x,p.y,size*(def.id==='fireflies'?1.65:2.4),0,0,alpha*(def.id==='fireflies'?.3:.4),0,p.phase,{mode:1,tint:this.glow,lift});}
   if(def.trail)for(let j=1;j<=4;j++)this.emit(space,p.x-p.vx*.075*j,p.y-p.vy*.075*j,size*(1-j*.17),448,0,alpha*(1-j*.2)*.35,0,p.phase,{lift});
   const frame=def.frames>1?Math.floor(t*(reducedMotion?4:def.fps)+i)%def.frames:0,variant=def.spriteVariants?.[i%def.spriteVariants.length],body=i>0&&def.bodySprite;
   const sx=body?body.x:variant?variant.x:def.spriteOffset+frame*64,sy=body?body.y:variant?variant.y:def.spriteY??0;
   let rotation=def.upright||def.formation==='ground'?0:p.rotation;
   if(def.id==='pathleaves'||def.id==='grain')rotation=p.rotation+p.phase;
   if(def.id==='weeds')rotation=Math.sin(p.phase)*.12;
   if(def.id==='termites'||def.id==='ants')rotation=-Math.PI/2+Math.sin(p.phase)*.22;
   if(def.behavior.chain){const ahead=i?particles.pool[i-1]:null;rotation=space.angle(ahead?ahead.x-p.x:p.vx,ahead?ahead.y-p.y:p.vy,this.world.camera);}
   // Deterministic visual variety only: preserve particle physics and hit radii.
   if(def.id==='fallingdebris')size*=.78+(i%4)*.12;
   if(def.id==='weeds'||def.id==='dew'||def.id==='pathleaves')size*=.82+(i%4)*.1;
   let height=def.id==='fallingdebris'?size*(.86+(i%3)*.1):size;
   if(def.id==='fire'){size*=.8+(i%3)*.12;height*=.78+(i%4)*.14;}
   if(def.behavior.chain){height*=1.45;if(i>particles.count-4)size*=1-(i-(particles.count-4))*.18;}
   this.emit(space,p.x,p.y,size,sx,sy,alpha,rotation,p.phase,{lift,height});
   if(def.secondary&&def.secondary.kind!=='mound'){
    const s=def.secondary,phase=(t*(s.kind==='rain'?(reducedMotion?.2:1.6):.5)+i*.19)%1;
    const sy=s.spriteY,sx=s.spriteOffset+(s.frames?Math.floor(t*s.fps+i)%s.frames*64:0),base=fade*(1-p.progress);
    if(s.kind==='rain'){
     // Staggered narrow drops below each cloud, fading at both ends of their fall.
     for(let j=0;j<3;j++){const fall=(phase+j/3)%1,opacity=Math.sin(fall*Math.PI)*.64;
      this.emit(space,p.x+(j-1)*size*.19,p.y,s.size*.48,sx,sy,base*opacity,-.12,p.phase,{height:s.size*.9,lift:-space.unit*(size*.17+fall*38)});}
    }else if(s.kind==='lightning'){
     const opacity=reducedMotion?.12:Math.sin(t*9+i)>.92?.9:0;
     this.emit(space,p.x,p.y,s.size*.65,sx,sy,base*opacity,0,p.phase,{height:s.size,lift:-space.unit*size*.4});
    }else{
     this.emit(space,p.x,p.y,s.size,sx,sy,base*.55,0,p.phase,{lift:s.kind==='smoke'?phase*2.5:0});
    }
   }
   const effect=FEEDBACK_SPRITES[def.feedback?.vfx],age=t-p.feedbackAt;
   if(effect&&age>=0&&age<.45)for(let j=0;j<3;j++){const angle=p.phase+j*2.094,travel=(reducedMotion?8:32)*age;this.emit(space,p.feedbackX+Math.cos(angle)*travel,p.feedbackY+Math.sin(angle)*travel,effect.size*(1-age/.55),effect.x,effect.y,fade*(1-age/.45)*.7,angle,p.phase,{lift:age*.4,mode:effect.glow?1:0});}
   if(effect&&p.progress>.95&&ending&&outcome==='completed'){const a=i*2.4;this.emit(space,p.x+Math.cos(a)*ending*40,p.y+Math.sin(a)*ending*40,effect.size,effect.x,effect.y,fade*.7,0,p.phase,{lift});}
  }
  this.mesh.geometry.instanceCount=this.count;this.buffer.needsUpdate=true;this.root.visible=this.count>0&&!!this.texture;
 }
 clear(){this.count=0;this.mesh.geometry.instanceCount=0;this.root.visible=false;}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();this.texture?.dispose();}
}
