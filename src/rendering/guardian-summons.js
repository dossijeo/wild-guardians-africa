import {guardianHandEmitters,guardianHandPosition} from './guardian-hand-emitters.js';
import {planRitualArc} from './guardian-ritual-path.js';
import {spellWindBinding,applySpellWind} from './guardian-spell-wind.js';
import {GuardianPose} from './guardian-pose.js';
import {GuardianLapPose} from './guardian-lap-pose.js';
import {GuardianRitual} from './guardian-ritual.js';
import {RITUAL,beginAwakening,revealAwakening} from './awakening-presentation.js';
import {pointGuardian} from './guardian-pointing.js';
import {GUARDIAN_ATTACK_TIMING as ATTACK_TIMING} from '../simulation/guardian-timing.js';
import * as THREE from 'three';
import {CharacterLod} from './character-lod.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GuardianFace} from '../ui/guardian-face.js';
import {guardianPropBounds} from './guardian-prop-bounds.js';
import {guardianPlacement} from './guardian-placement.js';
import {vfxEnvironment} from './vfx-native.js';
import {CameraBuildingRegistry} from './camera-building-registry.js';
import {wallCollisionBounds} from '../world/wall-collision-frame.js';
import {GuardianVortex} from './guardian-vortex.js';
import {guardianMaterial} from './guardian-material.js';
const COLORS={awakening:0x68ffda,growth:0xa8ed8b,multiply:0xe5b4ff,shield:0x8be8ec,attack:0xffcf79};
const CLIPS={growth:'Spell_Grow',multiply:'Spell_Multiply',shield:'Spell_Shield',attack:'Spell_Attack'};
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export class GuardianSummons{
 constructor(world){this.world=world;this.slots=[];this.pending=[];this.anchor=world.state.events.at(-1);this.presentationState=world.state;this.lastElapsed=world.state.elapsed;this.vector=new THREE.Vector3();this.direction=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);this.forward=new THREE.Vector3(0,0,1);this.aim=new THREE.Vector3();this.axis=new THREE.Vector3();this.q=new THREE.Quaternion();this.identity=new THREE.Quaternion();this.beamMatrix=new THREE.Matrix4();this.beamScale=new THREE.Vector3();this.stats={active:0,animationMs:0,vfxMs:0,vfxUpdateMs:0,vfxPrepareMs:0,auraAdvanceMs:0,reused:0};this.liveAttackTarget=id=>!id||this.world.state.raid?.animals.some(a=>a.id===id&&a.status!=='gone');this.ready=this.load();}
 async load(){
  const gltf=await this.world.assets.model('content/guardian/guardian.glb');if(this.disposed)return;
  const low=await this.world.assets.model('/content/character-lod/guardian.glb').catch(error=>{this.world.onError?.(error);return null;});if(this.disposed)return;
  this.beamGeometry=new THREE.CylinderGeometry(1,1,1,8,1,true);this.ringGeometry=new THREE.TorusGeometry(1,.045,5,32);this.coreGeometry=new THREE.IcosahedronGeometry(1,1);
  this.ritual=new GuardianRitual(this.world.scene);
  // A single ancestral spirit: subsequent casts wait for an active shot,
  // never its authoritative gameplay result and never create a second actor.
  for(let i=0;i<1;i++){
   const group=new THREE.Group(),model=clone(gltf.scene),materials=[];group.add(model);model.scale.setScalar(2.4);group.visible=false;
   model.traverse(o=>{if(o.isMesh){o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const copy=guardianMaterial(m,this.world.toon);materials.push(copy);return copy;});if(o.material.length===1)o.material=o.material[0];o.castShadow=false;o.frustumCulled=false;}});this.world.scene.add(group);
   model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),bottom=Number.isFinite(bounds.min.y)?bounds.min.y:-1.2,height=Number.isFinite(bounds.max.y)?bounds.max.y-bottom:3;
   const vortex=new GuardianVortex();this.world.scene.add(vortex);
   const wind=[];model.traverse(bone=>{if(bone.isBone){const binding=spellWindBinding(bone);if(binding)wind.push(binding);}});
   const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));for(const a of actions.values())a.play();
   const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
   const beam=new THREE.InstancedMesh(this.beamGeometry,material,8),impact=new THREE.Mesh(this.ringGeometry,material),core=new THREE.Mesh(this.coreGeometry,material);for(const m of [beam,impact,core]){m.visible=false;m.frustumCulled=false;this.world.scene.add(m);}
   const aura=this.world.vfxLibrary.create('repel',this.world.destructionPass,{density:.35,softParticles:false});aura.visible=false;aura.sprites.material.forceSinglePass=true;aura.ribbons.material.forceSinglePass=true;this.world.scene.add(aura);
   const eyes=['L','R'].map(side=>model.getObjectByName('Eye'+side)??model.getObjectByName('Eye.'+side)).filter(Boolean).map(bone=>({bone,rest:bone.quaternion.clone()}));
   beam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   this.slots.push({handEmitters:guardianHandEmitters(model),pose:new GuardianPose(model,mixer),lapPose:new GuardianLapPose(model,group),vortex,bottom,height,wind,group,model,materials,mixer,actions,eyes,face:new GuardianFace(model),beam,impact,core,material,aura,hand:model.getObjectByName('HandR')??model.getObjectByName('Hand.R'),hands:['L','R'].map(side=>model.getObjectByName('Hand'+side)??model.getObjectByName('Hand.'+side)).filter(Boolean),forearms:['L','R'].map(side=>model.getObjectByName('Forearm'+side)??model.getObjectByName('Forearm.'+side)).filter(Boolean),event:null});
   if(low){const slot=this.slots.at(-1);slot.lod=new CharacterLod(model,low.scene,{height,materialFactory:m=>{const ao=m.userData.modelAmbientVisibility;m.userData.modelAmbientVisibility={value:1};const result=guardianMaterial(m,this.world.toon);m.userData.modelAmbientVisibility=ao;return result;}});materials.push(...slot.lod.materials);}
  }
 }
 beforeLods(){for(const s of this.slots)s.lod?.beforePose();}
 updateLods(){for(const s of this.slots)s.lod?.update(this.world.camera,this.world.renderer.domElement.height,this.guide?false:this.world.characterLodForce??null);}
 plan(entityId,point,{bodyScale=1,hoverAbove=false}={}){const w=this.world,target=w.state.raid?.animals.find(a=>a.id===entityId)??w.state.plants.find(p=>p.id===entityId&&p.alive)??w.state.structures.find(s=>s.id===entityId)??point;if(!target)return null;
  // Reuse native building volumes: never raycast every skinned triangle for
  // each of the placement candidates. This work runs only on an accepted cast.
  this.occluders??=new CameraBuildingRegistry({centerMargin:0,villageMargin:0});
  this.occluders.sync(w.objects,[...w.state.villages,...w.state.structures.filter(s=>s.kind==='center')]);
  const index=this.occluders.index;
  for(const id of this.extraOccluders??[])index.delete(id);this.extraOccluders=[];
  const add=(id,min,max)=>{index.set(id,{min,max});this.extraOccluders.push(id);};
  for(const wall of w.state.structures)if(wall.kind==='wall'&&wall.status==='intact'&&Math.hypot(wall.x-target.x,wall.z-target.z)<15){const b=wallCollisionBounds(wall,0),y=w.nav.field.surface(wall.x,wall.z);add('wall:'+wall.id,[b[0],y,b[1]],[b[2],y+2.5,b[3]]);}
  for(const p of w.nav.propsAt?.(target.x,target.z,12)??[]){const bounds=guardianPropBounds(p,w.pack?.assets[p.slot],w.nav.field.surface(p.x,p.z));if(bounds)add('prop:'+p.id+':'+p.x+':'+p.z,bounds.min,bounds.max);}
  const eye=w.camera.position.toArray();
  return guardianPlacement({target,bodyScale,hoverAbove,screenExclusions:w.guardianScreenExclusions?.()??[],camera:w.camera,nav:w.nav,state:w.state,occluded:(x,y,z)=>!!index.sweep(eye,[x,y,z]),occupied:(x,y,z)=>!!index.sweep([x,y-bodyScale,z],[x,y+1.2*bodyScale,z],1.2*bodyScale),cropHeight:p=>w.cropBatch.sample(p.species,p.growth).height});
 }
 guideScreenPosition(){
  if(!this.guiding)return null;const s=this.slots[0];if(!s)return null;
  const p=this.vector.copy(s.group.position).project(this.world.camera),r=this.world.renderer.domElement.getBoundingClientRect();
  return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
 }
 setGuide(config){
  const key=config?JSON.stringify([config.target,config.position]):null;
  if(key===this.guideKey)return;this.guideKey=key;this.guide=config;this.guideOrigin=null;
 }
 // Re-evaluate persistent world guidance after orbit/zoom or changed obstacles.
 // Idle frames reuse the plan; camera motion is bounded to five plans per second.
 refreshGuidePlacement(stamp){
  const w=this.world,camera=w.camera,version=w.nav?.version;
  const view=this.guidePlacementView??={position:new THREE.Vector3(),rotation:new THREE.Quaternion(),projection:new THREE.Matrix4(),stamp:-Infinity,version:null};
  const changed=camera.position.distanceToSquared(view.position)>.75*.75||camera.quaternion.angleTo(view.rotation)>.087||!camera.projectionMatrix.equals(view.projection);
  if(this.guideOrigin&&version===view.version&&(!changed||stamp-view.stamp<.2))return;
  const p=this.guide.position;this.guideOrigin=this.plan(null,{x:p[0],z:p[2]},{bodyScale:1.7});
  view.position.copy(camera.position);view.rotation.copy(camera.quaternion);view.projection.copy(camera.projectionMatrix);view.stamp=stamp;view.version=version;
 }
 updateGuide(){
  const s=this.slots[0],w=this.world;
  if(!s||s.event)return false;
  if(!this.guide){if(this.guiding){s.group.visible=false;s.vortex.visible=false;}this.guiding=false;return false;}
  const stamp=performance.now()/1000;
  this.refreshGuidePlacement(stamp);if(!this.guideOrigin){s.group.visible=false;s.vortex.visible=false;this.guiding=false;this.guideStamp=stamp;return false;}
  const p=this.guide.position,origin=this.guideOrigin,dt=Math.min(.05,Math.max(0,stamp-(this.guideStamp??stamp)));this.guideStamp=stamp;
  if(!this.guiding){s.group.position.set(origin.x,origin.y+1.2,origin.z);this.guideTime=0;}
  this.guiding=true;this.guideTime+=dt;
  s.group.position.lerp(this.vector.set(origin.x,origin.y,origin.z),1-Math.exp(-dt*4));
  s.vortex.position.copy(s.group.position);s.vortex.update(this.guideTime,0xb8edce,s.height*1.7,s.bottom*1.7,true);
  s.model.scale.setScalar(2.4*1.7);s.group.rotation.y=Math.atan2(w.camera.position.x-s.group.position.x,w.camera.position.z-s.group.position.z);s.group.visible=true;
  for(const m of s.materials){m.opacity=1;m.uniforms.opacity.value=1;m.uniforms.uSpiritTint.value.setHex(0xffffff);m.uniforms.uSpiritGlow.value=.08;m.uniforms.uReveal.value=1.12;m.uniforms.uDissolve.value=0;m.uniforms.uBottom.value=s.group.position.y+s.bottom*1.7;m.uniforms.uHeight.value=s.height*1.7;}
  for(const [name,a] of s.actions){a.enabled=['Idle','Float','Mantle_Breeze'].includes(name);a.weight=1;a.time=this.guideTime%a.getClip().duration;}s.pose.update();
  const narration=w.guardianNarration?.();if(s.faceRecord!==narration?.record?.id){s.faceRecord=narration?.record?.id;s.face.setRecord(narration?.record);}s.face.update(narration?.audio??null,this.guideTime,{});
  s.group.updateMatrixWorld(true);pointGuardian(s.model,this.vector.set(...p),ease(this.guideTime/.6));
  for(const {bone,rest} of s.eyes){bone.quaternion.copy(rest);bone.parent.worldToLocal(this.aim.copy(w.camera.position));this.aim.sub(bone.position).applyQuaternion(this.q.copy(rest).invert()).normalize();this.aim.set(THREE.MathUtils.clamp(this.aim.x,-.13,.13),1,THREE.MathUtils.clamp(this.aim.z,-.12,.12)).normalize();bone.quaternion.multiply(this.q.setFromUnitVectors(this.up,this.aim));}
  return true;
 }
 liveCropTarget(event){return !['growth','multiply'].includes(event.kind)||!event.targetId||!!this.world.state.plants?.some(p=>p.id===event.targetId&&p.alive);}
 start(event,dequeued=false){if(!this.slots.length)return;const w=this.world,s=this.slots[0];
  if(!this.liveCropTarget(event)||event.kind==='attack'&&!this.liveAttackTarget(event.targetId))return;
  if(!dequeued&&(this.pending.length||(s.event?.kind==='attack'&&w.state.elapsed<s.at+ATTACK_TIMING.impact+ATTACK_TIMING.afterglow))){this.pending.push(event);return;}
  if(s.event)this.stats.reused++;
  this.hide(s);this.guiding=false;
  s.model.scale.setScalar(2.4);s.lastAge=0;s.outroSound=false;s.event=event;s.at=event.presentation?.elapsed??w.state.elapsed;s.origin=event.presentation?.origin??this.plan(event.targetId,{x:event.x,z:event.z},{hoverAbove:event.kind==='awakening'});if(!s.origin){s.event=null;return;}
  const contact=event.presentation?.contact??{x:event.x,y:w.nav.field.surface(event.x,event.z)+.5,z:event.z};s.target=new THREE.Vector3(contact.x,contact.y,contact.z);
  s.group.position.set(s.origin.x,s.origin.y,s.origin.z);s.group.rotation.y=Math.atan2(contact.x-s.origin.x,contact.z-s.origin.z);s.group.visible=true;s.material.color.setHex(COLORS[event.kind]);s.aura.position.copy(s.group.position);s.aura.position.y-=.8;s.aura.scale.setScalar(.65);s.aura.seek(0);s.aura.visible=true;s.vortex.position.copy(s.group.position);s.vortex.update(0,COLORS[event.kind],s.height,s.bottom);if(event.kind==='awakening'){s.ritualTarget=w.state.plants.find(p=>p.id===event.targetId)??w.state.structures.find(p=>p.id===event.targetId);s.ritualHeight=s.ritualTarget?.species?w.cropBatch.sample(s.ritualTarget.species,s.ritualTarget.growth).height:2;beginAwakening(s.ritualTarget,s.at);s.origin.y=Math.max(s.origin.y,contact.y+s.ritualHeight*.35+1.5);s.target.y=w.nav.field.surface(contact.x,contact.z)+.2;s.ritualArc=planRitualArc(s.origin,s.target,w.camera,(a,b,r)=>!!this.occluders?.index.sweep(a,b,r));}w.onGuardianPresence?.('spirit_appear',s.origin);s.aura.environment=vfxEnvironment(w.state.time>=300?1:0);
 }
 update(){const w=this.world,state=w.state;if(!this.slots.length)return;if(state.result){this.clear();return;}
  if(state!==this.presentationState||state.elapsed<this.lastElapsed){this.clear();this.anchor=state.events.at(-1);}
  this.presentationState=state;this.lastElapsed=state.elapsed;
  const events=state.events,index=this.anchor?events.lastIndexOf(this.anchor):-1;
  for(let i=index+1;i<events.length;i++){const e=events[i];if(e.type==='SpellActivated'&&state.elapsed-(e.presentation?.elapsed??-Infinity)<.5)this.start(e);else if(e.type==='BlessingApplied'&&state.elapsed-(e.presentation?.elapsed??-Infinity)<.5)this.start({...e,kind:'awakening',x:e.presentation.x,z:e.presentation.z});}this.anchor=events.at(-1);
  while(this.pending.length&&(!this.liveCropTarget(this.pending[0])||this.pending[0].kind==='attack'&&!this.liveAttackTarget(this.pending[0].targetId)))this.pending.shift();
  if(this.pending.length&&(!this.slots[0].event||state.elapsed>=this.slots[0].at+ATTACK_TIMING.impact+ATTACK_TIMING.afterglow)){const next=this.pending.shift();this.start({...next,presentation:{...next.presentation,elapsed:state.elapsed}},true);}
  const guideStart=performance.now(),guideActive=this.updateGuide();
  let anim=performance.now()-guideStart,vfx=0,auraAdvanceMs=0,active=guideActive?1:0;
  for(const s of this.slots){if(!s.event)continue;if(!this.liveCropTarget(s.event)){this.hide(s);continue;}const age=state.elapsed-s.at;
   // Cancel if the target vanished before any contact frame was presented.
   // A slow frame may cross the marker; current age alone cannot prove a hit.
   // Keep fading an impact that was already presented with a live victim.
   if(s.event.kind==='attack'&&s.lastAge<ATTACK_TIMING.impact&&!this.liveAttackTarget(s.event.targetId)){this.hide(s);continue;}
   if(s.event.kind==='awakening'){if(!s.ritualTarget?.blessing||(!s.ritualTarget.alive&&s.ritualTarget.kind!=='wall')||(s.ritualTarget.kind==='wall'&&s.ritualTarget.status!=='intact')){this.hide(s);continue;}if(age>=RITUAL.duration){this.hide(s);continue;}active++;const ritualStart=performance.now();this.ritual.update(this,s,age);anim+=performance.now()-ritualStart;if(age>=2.35&&!s.outroSound){s.outroSound=true;w.onGuardianPresence?.('spirit_disappear',s.origin);}continue;}if(age>2.2){this.hide(s);continue;}active++;
   if(age>=1.5&&!s.outroSound){s.outroSound=true;w.onGuardianPresence?.('spirit_disappear',s.origin);}
   const started=performance.now(),kind=s.event.kind,opacity=ease((age-(kind==='attack'?0:.06))/(kind==='attack'?.1:.18))*(1-ease((age-1.8)/.4));s.group.visible=true;
   for(const m of s.materials){m.opacity=opacity;m.uniforms.opacity.value=opacity;m.uniforms.uSpiritTint.value.setHex(COLORS[kind]);m.uniforms.uSpiritGlow.value=.13+.65*Math.exp(-(((age-(kind==='attack'?ATTACK_TIMING.impact:.48))/.14)**2));m.uniforms.uReveal.value=ease((age-(kind==='attack'?.02:.16))/(kind==='attack'?.12:.4))*1.12;m.uniforms.uDissolve.value=ease((age-1.5)/.7)*1.05;m.uniforms.uBottom.value=s.origin.y+s.bottom;m.uniforms.uHeight.value=s.height;}
   const clip=CLIPS[kind],selected=s.actions.has(clip)?clip:kind==='attack'?'Cast':'Invoke';
   for(const [name,a] of s.actions){a.enabled=['Float','Mantle_Spell',selected].includes(name);a.weight=1;a.time=name===selected?Math.min(a.getClip().duration,(kind==='attack'?(age<=ATTACK_TIMING.impact?.1+age/ATTACK_TIMING.impact*.5:.6+(age-ATTACK_TIMING.impact)/1.5*.4):age/1.5)*a.getClip().duration):state.elapsed%a.getClip().duration;}
   s.pose.update();
   applySpellWind(s.wind,age);
   const narration=w.guardianNarration?.();if(s.faceRecord!==narration?.record?.id){s.faceRecord=narration?.record?.id;s.face.setRecord(narration?.record);}s.face.update(narration?.audio??null,state.elapsed,{expression:{name:kind==='attack'?'focus':kind==='growth'?'joy':'surprise',value:.25*opacity}});s.group.updateMatrixWorld(true);
   const reachWeight=ease(age/.1)*(1-ease((age-.8)/.7));
   for(const bone of s.forearms)this.aimJoint(bone,s.target,.5*reachWeight);
   for(const bone of s.hands)this.aimJoint(bone,s.target,1.1*reachWeight);
   s.group.updateMatrixWorld(true);
   for(const {bone,rest} of s.eyes){bone.quaternion.copy(rest);bone.parent.worldToLocal(this.aim.copy(s.target));this.aim.sub(bone.position).applyQuaternion(this.q.copy(rest).invert()).normalize();this.aim.set(THREE.MathUtils.clamp(this.aim.x,-.13,.13),1,THREE.MathUtils.clamp(this.aim.z,-.12,.12)).normalize();bone.quaternion.multiply(this.q.setFromUnitVectors(this.up,this.aim));}
   anim+=performance.now()-started;
   const visual=performance.now();s.vortex.update(age,COLORS[kind],s.height,s.bottom);const auraStarted=performance.now();s.aura.advance(Math.max(0,age-(s.lastAge??0)));auraAdvanceMs+=performance.now()-auraStarted;s.lastAge=age;
   const attack=kind==='attack',impactAge=state.elapsed-(s.at+ATTACK_TIMING.impact);
   const flight=THREE.MathUtils.clamp((age-ATTACK_TIMING.release)/(ATTACK_TIMING.impact-ATTACK_TIMING.release),0,1);
   const release=attack?(age<ATTACK_TIMING.impact?ease(age/ATTACK_TIMING.release):Math.max(0,1-impactAge/ATTACK_TIMING.afterglow)):Math.sin(Math.PI*Math.min(1,age/1.25));
   s.material.opacity=release*(attack?.9:.7);const beam=s.beam;
   beam.visible=release>.01&&(!attack||age>=ATTACK_TIMING.release);
   s.impact.visible=release>.01&&(!attack||impactAge>=0);s.core.visible=release>.01;
   if(s.core.visible){
    const branching=kind==='multiply';beam.position.set(0,0,0);beam.count=attack?1:branching?8:2;
    for(let i=0;i<beam.count;i++){
     const hand=attack?s.hand:s.hands[branching&&i>=2?Math.floor((i-2)/3):i];if(hand)guardianHandPosition(s.handEmitters,hand,this.vector);if(!hand)this.vector.copy(s.group.position);
     if(branching){
      // Two hand-fed trunks divide into six rays around the crop. All eight
      // segments share one instanced draw and the existing material/geometry.
      this.aim.copy(s.target).lerp(this.vector,.35);this.aim.y+=.25;
      if(i>=2){this.vector.copy(this.aim);const angle=(i-2)*Math.PI/3+age*.5,radius=.65*ease(age/.35);this.aim.copy(s.target);this.aim.x+=Math.cos(angle)*radius;this.aim.z+=Math.sin(angle)*radius;}
      this.direction.copy(this.aim).sub(this.vector);
     }else this.direction.copy(s.target).sub(this.vector);const length=this.direction.length(),front=attack?flight:1;
     const tail=attack?Math.max(0,front-.65,impactAge/ATTACK_TIMING.afterglow):0;
     if(i===0)s.core.position.copy(this.vector).addScaledVector(this.direction,front);
     this.vector.addScaledVector(this.direction,(front+tail)/2);this.q.setFromUnitVectors(this.up,this.direction.normalize());
     this.beamScale.set(attack?.11:.028,Math.max(.001,length*(front-tail)),attack?.11:.028);beam.setMatrixAt(i,this.beamMatrix.compose(this.vector,this.q,this.beamScale));
    }
    if(branching){s.core.position.copy(s.target);this.direction.copy(s.target).sub(s.group.position).normalize();}
    beam.instanceMatrix.needsUpdate=true;s.core.scale.setScalar(attack?(impactAge<0?.1+.12*release:.16+.3*release):.12+.16*release);
    s.impact.position.copy(s.target);s.impact.quaternion.setFromUnitVectors(this.forward,this.direction);s.impact.scale.setScalar(.15+(attack?Math.max(0,impactAge)*4:age));
   }
   vfx+=performance.now()-visual;
  }
  if(!active&&this.guide){const started=performance.now();active=this.updateGuide()?1:0;anim+=performance.now()-started;}
  Object.assign(this.stats,{active,retainedAttacks:0,animationMs:anim,vfxMs:vfx,vfxUpdateMs:vfx,vfxPrepareMs:0,auraAdvanceMs});
 }
 aimJoint(bone,target,limit){
  if(limit<=0)return;
  bone.parent.worldToLocal(this.aim.copy(target));this.aim.sub(bone.position).normalize();this.axis.copy(this.up).applyQuaternion(bone.quaternion);
  this.q.setFromUnitVectors(this.axis,this.aim);const angle=this.q.angleTo(this.identity);if(angle>limit)this.q.slerp(this.identity,1-limit/angle);
  bone.quaternion.premultiply(this.q);bone.updateWorldMatrix(false,true);
 }
 prepare(camera){const started=performance.now();let depth=false;for(const s of this.slots)if(s.event){depth=s.aura.prepare(camera,this.world.scene)||depth;for(const light of s.aura.localLights)light.visible=false;}this.stats.vfxPrepareMs=performance.now()-started;this.stats.vfxMs+=this.stats.vfxPrepareMs;return depth;}
 beginPrewarm(){for(const s of this.slots){s.group.visible=true;s.group.position.copy(this.world.controls.target);for(const m of s.materials)m.opacity=1;for(const [name,a] of s.actions){a.enabled=['Idle','Float','Mantle_Breeze'].includes(name);a.time=0;}s.pose.update();for(const m of [s.beam,s.impact,s.core]){m.visible=true;m.position.copy(s.group.position);m.frustumCulled=false;}s.vortex.position.copy(s.group.position);s.vortex.update(.3,0xa8ed8b,s.height,s.bottom);s.material.opacity=.5;s.aura.position.copy(s.group.position);s.aura.visible=true;s.aura.seek(.5);s.aura.prepare(this.world.camera,this.world.scene);for(const light of s.aura.localLights)light.visible=false;}}
 endPrewarm(){this.clear();}
 hide(s){if(s.event?.kind==='awakening')revealAwakening(s.ritualTarget,this.world.state.elapsed);s.ritualTarget=null;this.ritual?.hide();s.event=null;s.lastAge=0;s.aura.clear();for(const o of [s.group,s.aura,s.beam,s.impact,s.core,s.vortex])o.visible=false;}
 clear(){this.pending.length=0;this.guiding=false;this.guide=null;this.guideKey=null;this.guideOrigin=null;for(const s of this.slots)this.hide(s);Object.assign(this.stats,{active:0,retainedAttacks:0,animationMs:0,vfxMs:0,vfxUpdateMs:0,vfxPrepareMs:0,auraAdvanceMs:0});}
 dispose(){if(this.disposed)return;this.disposed=true;this.clear();this.ritual?.dispose();for(const s of this.slots){s.lod?.dispose();s.mixer.stopAllAction();s.mixer.uncacheRoot(s.model);s.model.traverse(o=>o.skeleton?.dispose());for(const m of s.materials)if(!s.lod?.materials.includes(m))m.dispose();s.face.dispose();s.vortex.dispose();s.aura.dispose();s.beam.dispose();s.material.dispose();for(const o of [s.group,s.aura,s.beam,s.impact,s.core,s.vortex])this.world.scene.remove(o);}this.beamGeometry?.dispose();this.ringGeometry?.dispose();this.coreGeometry?.dispose();this.slots.length=0;}
}
