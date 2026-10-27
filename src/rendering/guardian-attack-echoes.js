import {InstancedMesh,MeshBasicMaterial,AdditiveBlending,DynamicDrawUsage,Vector3,Quaternion,Matrix4,Color,MathUtils} from 'three';
import {GUARDIAN_ATTACK_TIMING as TIMING} from '../simulation/guardian-timing.js';
const targetPresent=()=>true;
const smooth=t=>{t=MathUtils.clamp(t,0,1);return t*t*(3-2*t);};

// Only the energy survives a replaced summon. The character remains a singleton.
// Borrow geometries, reuse eight numeric records and batch all residual attacks
// into at most three draws. No geometry/material creation on a cast.
export class GuardianAttackEchoes {
 constructor(scene,{beam,core,ring},capacity=8){
  this.scene=scene;this.records=Array.from({length:capacity},()=>({active:false,at:0,source:new Vector3(),target:new Vector3(),targetId:null}));
  this.material=new MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false});
  this.meshes={beam:new InstancedMesh(beam,this.material,capacity),core:new InstancedMesh(core,this.material,capacity),ring:new InstancedMesh(ring,this.material,capacity)};
  this.draws=Object.values(this.meshes);
  this.color=new Color(0xffcf79);this.tint=new Color();this.direction=new Vector3();this.position=new Vector3();this.scale=new Vector3();this.q=new Quaternion();this.identity=new Quaternion();this.matrix=new Matrix4();this.up=new Vector3(0,1,0);this.forward=new Vector3(0,0,1);
  this.stats={active:0,evicted:0};
  for(const mesh of this.draws){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(DynamicDrawUsage);mesh.setColorAt(0,this.color);mesh.instanceColor.setUsage(DynamicDrawUsage);scene.add(mesh);}
 }
 retain(at,source,target,targetId=null){
  let record=this.records.find(r=>!r.active);
  if(!record){record=this.records.reduce((a,b)=>a.at<b.at?a:b);this.stats.evicted++;}
  record.active=true;record.at=at;record.source.copy(source);record.target.copy(target);record.targetId=targetId;
  return record;
 }
 instance(mesh,position,rotation,scale,strength){
  mesh.setMatrixAt(mesh.count,this.matrix.compose(position,rotation,scale));mesh.setColorAt(mesh.count,this.tint.copy(this.color).multiplyScalar(strength*.9));mesh.count++;
 }
 update(elapsed,targetExists=targetPresent){
  for(const mesh of this.draws)mesh.count=0;let active=0;
  for(const record of this.records){
   if(!record.active)continue;const age=elapsed-record.at,impactAge=elapsed-(record.at+TIMING.impact);
   if(impactAge>=TIMING.afterglow||(impactAge<0&&!targetExists(record.targetId))){record.active=false;continue;}
   active++;if(age<0)continue;
   const strength=impactAge<0?smooth(age/TIMING.release):Math.max(0,1-impactAge/TIMING.afterglow);if(strength<=.01)continue;
   const front=MathUtils.clamp((age-TIMING.release)/(TIMING.impact-TIMING.release),0,1),tail=Math.max(0,front-.65,impactAge/TIMING.afterglow);
   this.direction.copy(record.target).sub(record.source);const length=this.direction.length();
   this.position.copy(record.source).addScaledVector(this.direction,front);const radius=impactAge<0?.1+.12*strength:.16+.3*strength;
   this.instance(this.meshes.core,this.position,this.identity,this.scale.setScalar(radius),strength);
   this.position.copy(record.source).addScaledVector(this.direction,(front+tail)/2);this.direction.normalize();
   if(age>=TIMING.release){this.q.setFromUnitVectors(this.up,this.direction);this.instance(this.meshes.beam,this.position,this.q,this.scale.set(.11,Math.max(.001,length*(front-tail)),.11),strength);}
   if(impactAge>=0){this.q.setFromUnitVectors(this.forward,this.direction);this.instance(this.meshes.ring,record.target,this.q,this.scale.setScalar(.15+impactAge*4),strength);}
  }
  for(const mesh of this.draws){mesh.visible=mesh.count>0;if(mesh.visible){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}}
  this.stats.active=active;
 }
 clear(){for(const record of this.records)record.active=false;for(const mesh of this.draws){mesh.count=0;mesh.visible=false;}this.stats.active=0;}
 dispose(){this.clear();for(const mesh of this.draws){this.scene.remove(mesh);mesh.dispose();}this.material.dispose();}
}
