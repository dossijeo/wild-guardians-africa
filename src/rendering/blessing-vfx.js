import {beginAwakening,awakeningVisible} from './awakening-presentation.js';
import * as THREE from 'three';
import {observeGameEvents} from '../simulation/game.js';
import {vfxEnvironment} from './vfx-native.js';

// All resting sources share one culled Points draw. Only event/origin changes upload data.
export class BlessingVfx {
  constructor(library,pipeline,scene,surface,state,{height=()=>1,motion=true}={}){
    Object.assign(this,{library,pipeline,scene,surface,state,height});
    this.pending=new Map();this.clock={value:state.elapsed};this.sources=new Map();this.expiring=new Set();this.damageAt=new Map();this.effects=new Map();this.origin={x:0,z:0};this.dirty=true;
    for(const target of [...state.plants,...state.structures])if(target.blessing)this.sources.set(target.id,{target,born:target.blessing.at,dead:-1});
    this.geometry=new THREE.BufferGeometry();
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending,
      uniforms:{uClock:this.clock,uMotion:{value:motion?1:0}},
      vertexShader:`attribute vec4 aSource;uniform float uClock,uMotion;varying float vSparkAlpha,vAura;
        void main(){float phase=fract(uClock*.10+aSource.x*.381966);float angle=aSource.x*2.39996;vAura=aSource.w;
          vec3 p=position+vec3(cos(angle+phase*2.)*.46*uMotion,.12+phase*max(.6,aSource.y*1.4)*uMotion,sin(angle+phase*2.)*.46*uMotion)*(1.-vAura);
          float lost=aSource.z<0.?1.:1.-smoothstep(0.,.65,uClock-aSource.z);
          vSparkAlpha=mix(sin(phase*3.14159)*.95,.16,vAura)*lost;
          vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=mix(clamp(95./max(.1,-mv.z),2.,11.),clamp(850.*aSource.y/max(.1,-mv.z),6.,160.),vAura);
        }`,
      fragmentShader:`varying float vSparkAlpha,vAura;void main(){float r=length(gl_PointCoord-.5)*2.;float core=exp(-r*r*28.),a=exp(-r*r*5.)*(1.-smoothstep(.7,1.,r));
        gl_FragColor=vec4(mix(vec3(.18,.95,.75)+vec3(.75)*core,vec3(.02,1.,.70),vAura),a*vSparkAlpha);
        #include <colorspace_fragment>
      }`});
    this.points=new THREE.Points(this.geometry,this.material);this.points.name='awakening-sparks';this.points.raycast=()=>{};scene.add(this.points);
    this.releaseEvents=observeGameEvents(state,event=>this.event(event));
    this.stats={uploads:0,sources:0,particles:0};
  }
  event(event){
    if(event.type==='BlessingApplied'){
      const target=this.state.plants.find(p=>p.id===event.targetId)??this.state.structures.find(p=>p.id===event.targetId);
      if(!target)return;beginAwakening(target,event.presentation?.elapsed??this.state.elapsed);this.pending.set(target.id,target);
    }else if(event.type==='CropHit'||event.type==='StructureHit'){
      if(this.sources.has(event.targetId))this.damageAt.set(event.targetId,this.state.elapsed);
    }else if(event.type==='BlessingDestroyed'||event.type==='BlessingRemoved'){
      this.pending.delete(event.targetId);const source=this.sources.get(event.targetId);if(!source)return;
      source.dead=this.state.elapsed;this.expiring.add(event.targetId);this.dirty=true;this.damageAt.delete(event.targetId);
    }
  }
  update(state,origin={x:0,z:0}){
    this.clock.value=state.elapsed;for(const [id,target] of this.pending)if(awakeningVisible(target,state.elapsed)){this.pending.delete(id);if(target.alive||target.kind==='wall'&&target.status==='intact'){this.sources.set(id,{target,born:state.elapsed,dead:-1});this.dirty=true;}}
    for(const id of this.expiring){const source=this.sources.get(id);if(!source||state.elapsed-source.dead>=.65){this.expiring.delete(id);this.sources.delete(id);this.dirty=true;}}
    if(origin.x!==this.origin.x||origin.z!==this.origin.z){this.origin={x:origin.x,z:origin.z};this.dirty=true;}
    if(this.dirty){
      const positions=[],data=[];let maximumHeight=.2;
      for(const {target,dead} of this.sources.values())for(let i=0;i<(target.species?19:16);i++){
        const aura=i>=16,height=Math.max(.2,this.height(target));maximumHeight=Math.max(maximumHeight,height);
        positions.push(target.x-origin.x,this.surface(target.x,target.z)+height*(aura?.22+(i-16)*.28:.22),target.z-origin.z);
        data.push((Number(target.id.replace(/\D/g,''))||0)*19+i,height,dead,aura?1:0);
      }
      this.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      this.geometry.setAttribute('aSource',new THREE.Float32BufferAttribute(data,4));this.geometry.computeBoundingSphere();if(this.geometry.boundingSphere)this.geometry.boundingSphere.radius+=Math.max(2,maximumHeight*1.4+.6);
      this.points.visible=positions.length>0;this.points.position.set(origin.x,0,origin.z);this.dirty=false;
      this.stats.uploads++;this.stats.sources=this.sources.size;this.stats.particles=positions.length/3;
    }
    const environment=vfxEnvironment(state.time>=300?1:0);
    for(const [id,entry] of this.effects){const age=Math.max(0,state.elapsed-entry.at);
      if(age>=2.8){entry.effect.dispose();this.effects.delete(id);continue;}
      entry.effect.environment=environment;
      if(age<entry.effect.native.time)entry.effect.seek(age);else entry.effect.advance(age-entry.effect.native.time);
    }
  }
  prepare(camera){for(const {effect} of this.effects.values())effect.prepare(camera,this.scene);return false;}
  dispose(){this.releaseEvents();this.pending.clear();for(const {effect} of this.effects.values())effect.dispose();this.effects.clear();this.scene.remove(this.points);this.geometry.dispose();this.material.dispose();this.sources.clear();this.expiring.clear();this.damageAt.clear();}
}
