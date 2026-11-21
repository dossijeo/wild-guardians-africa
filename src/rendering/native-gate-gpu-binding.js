import {copyNativeWorldBoundary} from '../world/native-world-boundary.js';
import {Box3,Matrix4,Mesh,Sphere,Vector2,Vector3} from 'three';
import {Fn,If,Loop,attribute,clamp,float,int,mix,normalLocal,rotate,uniform,uniformArray,vec3} from 'three/tsl';
import {copyNativeGatePresentation} from '../world/native-gate-presentation.js';
import {floorFloat32,ceilFloat32} from './float32-time.js';
import {cloneWebGpuNodeMaterial} from './webgpu-clone-node-material.js';
import {structureMaterialReplica} from './structure-material-replica.js';
import {wallStages,morphedWallPositions} from './walls-native.js';

// One rigid leaf on the existing wall mesh. The existing actor clock is shared
// as data; neither this owner nor its input proxy advances an authoritative motor.
export function createNativeGateGpuBinding({wall,presentation,motion,getPickTime,presentationClock=null,getPresentationTime=null}={}){
 let packet=copyNativeGatePresentation(presentation,presentation);const installed=motion?.status?.().installed;
 if(packet.worldBoundary&&(installed?.nativeGate?.gateId!==packet.gateId||JSON.stringify(installed.nativeGate.worldBoundary)!==JSON.stringify(packet.worldBoundary)))throw Error('Native gate clock world mismatch');
 if(!wall?.isObject3D||wall.entityId!==packet.entityId||wall.nativeGateBinding||!wall.gate||!Number.isFinite(wall.visual)||wall.visual<=0||wall.visual>1||wall.target!==wall.visual||wall.lastStatus!=='intact'||wall.parts?.length!==(wall.visual===1?1:2)||typeof getPickTime!=='function'||!motion?.timeNode?.isNode||JSON.stringify(installed?.nativeRoute)!==JSON.stringify(packet.nativeRoute)||installed.start.at!==packet.startTime||installed.end.at!==packet.endTime)throw Error('Native gate graphics unavailable');
 const visual=wall.visual,parts=wall.parts.slice(),stages=wallStages({material:wall.nativeGateMaterial,kind:'gate',visual});
 if(wall.stageKey!==stages.map(stage=>stage.key+'>'+stage.dest).join('|')||!parts[0]?.bridge.leafFlags||parts.slice(1).some(part=>part.bridge.leafFlags))throw Error('Native gate damage topology unavailable');
 const siblings=parts.slice(1).map(part=>({part,geometry:part.mesh.geometry,material:part.mesh.material}));
 const shapeCurrent=()=>wall.visual===visual&&wall.parts.length===parts.length&&parts.every((part,i)=>wall.parts[i]===part&&part.mesh.parent===wall)&&siblings.every(({part,geometry})=>part.mesh.geometry===geometry);
 const part=wall.parts[0],mesh=part.mesh,geometry=mesh.geometry;let previous=wall.nativeGpuGate??wall.nativeGpuRepair??null;const previousRepair=previous!=null&&previous===wall.nativeGpuRepair;const original=previous?.originalMaterial??mesh.material,timeNode=motion.timeNode;
 if(!original?.isNodeMaterial||original.positionNode||original.normalNode||geometry.attributes.wgGatePosition?.count!==packet.leafFlags.length||geometry.attributes.wgGateNormal?.count!==packet.leafFlags.length||geometry.attributes.wgGateLeaf?.count!==packet.leafFlags.length||packet.modelId!==({zarzas:1,empalizada:2,reforzado:3}[wall.nativeGateMaterial]))throw Error('Native gate material or geometry unavailable');
 for(let i=0;i<packet.positions.length;i++)if(Math.abs(packet.positions[i]-part.bridge.pos[i])>1e-6)throw Error('Native gate rest geometry mismatch');
 for(let i=0;i<packet.leafFlags.length;i++)if(packet.leafFlags[i]!==geometry.attributes.wgGateLeaf.array[i])throw Error('Native gate leaf partition mismatch');
 const rest=morphedWallPositions(part.bridge,stages[0].morph);
 if(rest.length!==geometry.attributes.wgGatePosition.array.length||rest.some((v,i)=>v!==geometry.attributes.wgGatePosition.array[i]))throw Error('Native gate damage rest geometry mismatch');
 const root=new Matrix4().fromArray(packet.rootMatrix),hinge=new Vector3().fromArray(packet.hinge);let duration=floorFloat32(packet.endTime-packet.startTime);const rows=Array.from({length:6},(_,i)=>{const at=Math.min(i,packet.rows.length/2-1)*2;return new Vector2(at===packet.rows.length-2?duration:ceilFloat32(packet.rows[at]-packet.startTime),Math.fround(packet.rows[at+1]));}),knots=uniformArray(rows,'vec2').setName('nativeGateKnots'),count=uniform(packet.rows.length/2,'int'),pivot=uniform(hinge);
 const opening=motion.openingNode??Fn(()=>{const value=knots.element(int(0)).y.toVar();Loop({start:1,end:6},({i})=>{If(i.lessThan(count),()=>{const a=knots.element(i.sub(1)),b=knots.element(i),t=clamp(timeNode.sub(a.x).div(b.x.sub(a.x).max(1e-30)),0,1);value.assign(mix(value,b.y,t));});});return value;})();
 const angle=opening.mul(Math.PI/2).mul(attribute('wgGateLeaf','float'));
 const material=cloneWebGpuNodeMaterial(original);material.userData=original.userData;
 material.positionNode=Fn(()=>{normalLocal.assign(rotate(attribute('wgGateNormal','vec3'),vec3(0,angle,0)));return rotate(attribute('wgGatePosition','vec3').sub(pivot),vec3(0,angle,0)).add(pivot);})();
 let unregister;try{unregister=part.sourceMaterial?.[structureMaterialReplica]?.(material);}catch(error){material.dispose();throw error;}
 const originalRaycast=previous?.originalRaycast??mesh.raycast,originalBounds=previous?.originalBounds??geometry.boundingBox.clone(),originalSphere=previous?.originalSphere??geometry.boundingSphere.clone(),bounds=new Box3().setFromBufferAttribute(geometry.attributes.wgGatePosition);
 let radius=0;for(let i=0;i<packet.leafFlags.length;i++)if(packet.leafFlags[i])radius=Math.max(radius,Math.hypot(rest[i*3]-hinge.x,rest[i*3+2]-hinge.z));
 bounds.expandByPoint(new Vector3(hinge.x-radius,bounds.min.y,hinge.z-radius));bounds.expandByPoint(new Vector3(hinge.x+radius,bounds.max.y,hinge.z+radius));const sphere=bounds.getBoundingSphere(new Sphere());
 let repairLayer=null;
 try{if(visual<1&&presentationClock)repairLayer=createGateRepairLayer({parts,material,opening,pivot,presentationClock,getPresentationTime,visual,previous});}catch(error){unregister?.();material.dispose();throw error;}
 if(repairLayer){bounds.union(repairLayer.records[0].bounds);bounds.getBoundingSphere(sphere);}
 const proxy=new Mesh(geometry,original),rotation=new Matrix4();let disposed=false,activated=false,committed=false;
 proxy.getVertexPosition=(index,target)=>{if(repairLayer)repairLayer.position(0,index,target);else target.fromBufferAttribute(geometry.attributes.wgGatePosition,index);if(packet.leafFlags[index])target.sub(hinge).applyMatrix4(rotation).add(hinge);return target;};
 function sample(at){
  if(motion.stoppedSelector)return motion.sampleOpening();
  if(!Number.isFinite(at)||at<packet.startTime)throw Error('Native gate input frame unavailable');
  const raw=floorFloat32(at-packet.startTime),time=Math.max(0,Math.min(Math.fround(raw-Math.fround(Math.max(Math.abs(raw),1)*.000000476837158203125)),duration));
  let value=rows[0].y;for(let i=1;i<packet.rows.length/2;i++){const a=rows[i-1],b=rows[i],t=Math.max(0,Math.min(1,(time-a.x)/Math.max(1e-30,b.x-a.x)));value=value+(b.y-value)*t;}return value;
 }
 function raycast(raycaster,hits){rotation.makeRotationY(-sample(getPickTime())*Math.PI/2);proxy.matrixWorld.copy(mesh.matrixWorld);const found=[];Mesh.prototype.raycast.call(proxy,raycaster,found);for(const hit of found){hit.object=mesh;hits.push(hit);}}
 function rootCurrent(){wall.updateWorldMatrix(true,true);return mesh.matrixWorld.elements.every((value,i)=>Math.abs(value-root.elements[i])<=1e-5);}
 const binding={material,mesh,repairLayer,materialAlternatives:[{mesh,material},...(repairLayer?.records.slice(1).map(r=>({mesh:r.mesh,material:r.material}))??[])],originalMaterial:original,originalRaycast,originalBounds,originalSphere,lease:Object.freeze({start:packet.startTime,end:packet.worldBoundary?Number.MAX_SAFE_INTEGER:packet.endTime}),nativeRoute:packet.nativeRoute,nativeGate:installed.nativeGate??null,
  canActivate:()=>!disposed&&!activated&&shapeCurrent()&&wall.parts[0]===part&&(wall.nativeGpuGate??wall.nativeGpuRepair??null)===previous&&mesh.material===(previous?.material??original)&&siblings.every(({part,material})=>part.mesh.material===material)&&rootCurrent(),
  current:()=>!disposed&&activated&&shapeCurrent()&&wall.nativeGpuGate===binding&&wall.parts[0]===part&&mesh.material===material&&(repairLayer?repairLayer.current():siblings.every(({part,material})=>part.mesh.material===material))&&rootCurrent(),
  checkEntity(entity,elapsed){if(entity.gate!==true||entity.status!=='intact'||!Number.isFinite(entity.hp)||!Number.isFinite(entity.maxHp)||entity.maxHp<=0||entity.material!==wall.nativeGateMaterial||!binding.current()||!(repairLayer?repairLayer.accept(entity,elapsed):entity.hp/entity.maxHp===visual))throw Error('Native gate requires a prepared geometry or lifecycle transition');},
  sampleOpening:sample,
  // A stopped actor can leave a historical crossing without changing its motor.
  // Retain only the independent, committed world clock on this exact owner.
  captureRemoval(reference){
   const r=reference.removal,next=copyNativeWorldBoundary(reference.worldBoundary),source=packet.worldBoundary;
   if(!r||!next||!source||!committed||!binding.current()||r.entityId!==packet.entityId||r.mechanismId!==packet.mechanism||next.authorityEpoch!==source.authorityEpoch||next.nativeSession!==source.nativeSession||next.ticket<=source.ticket||next.effectiveTime<source.effectiveTime)throw Error('Native gate removal lost its resident mechanism');
   const original=packet,clock=motion.status().installed;return ()=>committed&&binding.current()&&packet===original&&motion.status().installed.nativeGate===clock.nativeGate;
  },
  captureRetention(presentation,proposedBoundary){
   // The caller supplies an already-copied route packet. Compare its shape
   // against our private validated packet without copying the vertex arrays.
   // Its historical curve and route clock grant no retention permission.
   const expected=presentation,next=copyNativeWorldBoundary(proposedBoundary),source=packet.worldBoundary;
   if(!committed||!binding.current()||!source||!next||!expected||!(expected.positions instanceof Float32Array)||!(expected.leafFlags instanceof Uint8Array)||source.authorityEpoch!==next.authorityEpoch||source.nativeSession!==next.nativeSession||source.ticket>=next.ticket||source.effectiveTime>next.effectiveTime||
      ['gateId','entityId','mechanism','modelId'].some(key=>packet[key]!==expected[key])||
      ['rootMatrix','hinge','positions','leafFlags'].some(key=>packet[key].length!==expected[key]?.length||packet[key].some((v,i)=>!Object.is(v,expected[key][i]))))
    throw Error('Native stopped gate has no matching independent resident motor');
   const retainedPacket=packet,clock=motion.status().installed;
   return ()=>committed&&packet===retainedPacket&&binding.current()&&motion.status().installed.nativeGate===clock.nativeGate&&motion.status().installed.start===clock.start&&motion.status().installed.end===clock.end;
  },
  // A visual Repair replacement borrows this already-published clock. It
  // changes no motor, route, epoch, time interval or logical gate identity.
  prepareReplacement(nextWall){
   if(!committed||!binding.current()||!packet.worldBoundary||nextWall===wall||nextWall.parent!==wall.parent||nextWall.visible!==false||nextWall.visual!==1||nextWall.entityId!==wall.entityId)throw Error('Native gate replacement has no retained motor');
   const next=createNativeGateGpuBinding({wall:nextWall,presentation:packet,motion,getPickTime,presentationClock,getPresentationTime});
   try{next.activate();return next;}catch(error){next.dispose();throw error;}
  },
  retarget(value,{retagClock}={}){
   if(disposed||committed||activated||!binding.canActivate()||typeof motion.retarget!=='function')throw Error('Native gate resource cannot be retargeted');
   const next=copyNativeGatePresentation(value,value);
   if(!packet.worldBoundary||!next.worldBoundary||['gateId','entityId','mechanism','modelId'].some(key=>packet[key]!==next[key])||['rootMatrix','hinge','positions','leafFlags'].some(key=>packet[key].length!==next[key].length||packet[key].some((v,i)=>!Object.is(v,next[key][i]))))return false;
   if(motion.retarget(next,{retagClock})!==true)return false;
   for(let i=0;i<6;i++){const at=Math.min(i,next.rows.length/2-1)*2;rows[i].set(at===next.rows.length-2?floorFloat32(next.endTime-next.startTime):ceilFloat32(next.rows[at]-next.startTime),Math.fround(next.rows[at+1]));}count.value=next.rows.length/2;duration=floorFloat32(next.endTime-next.startTime);packet=next;binding.nativeGate=motion.status().installed.nativeGate;binding.lease=Object.freeze({start:next.startTime,end:Number.MAX_SAFE_INTEGER});return true;
  },
  capturePresentation(record){
   if(typeof record!=='function'||!binding.canActivate())throw Error('Native gate capture unavailable');const expected=mesh.material;let result,changed=false;
   try{mesh.material=material;result=repairLayer?repairLayer.capture(record):record();changed=mesh.material!==material;if(result&&typeof result.then==='function')throw Error('Native gate capture must be synchronous');}finally{mesh.material=expected;}
   if(changed||!binding.canActivate())throw Error('Native gate capture changed ownership');return result;
  },
  activate(){if(!binding.canActivate())throw Error('Native gate graphics changed during preparation');activated=true;wall.nativeGpuGate=binding;mesh.material=material;mesh.raycast=raycast;geometry.boundingBox=bounds;geometry.boundingSphere=sphere;repairLayer?.activate();},
  commit(){if(committed||!binding.current())throw Error('Native gate publication changed');committed=true;motion.seal?.();previous=null;},
  rollback(){if(!activated)return;if(committed||wall.nativeGpuGate!==binding)throw Error('Native gate replacement ownership changed');repairLayer?.rollback();activated=false;wall.nativeGpuGate=previousRepair?null:previous;mesh.material=previous?.material??original;mesh.raycast=previous?.raycast??originalRaycast;geometry.boundingBox=previous?.bounds??originalBounds;geometry.boundingSphere=previous?.sphere??originalSphere;},
  raycast,bounds,sphere,
  dispose(){if(disposed)return;disposed=true;if(wall.nativeGpuGate===binding){wall.nativeGpuGate=null;mesh.material=original;mesh.raycast=originalRaycast;geometry.boundingBox=originalBounds;geometry.boundingSphere=originalSphere;}repairLayer?.dispose();unregister?.();material.dispose();}
 };
 if(!binding.canActivate()){binding.dispose();throw Error('Native gate placement does not match its native mechanism');}
 return binding;
}

// A restored Repair is presentation state, not a native motor permission.
// Install the existing morph layer before the slot's first admission. The saved
// opening remains fixed until a real native gate binding acquires this owner.
export function bindRestoredGateRepair({wall,entity,elapsed,presentationClock,getPresentationTime}={}){
 const p=entity?.wallPresentation,parts=wall?.parts;
 if(!wall?.isObject3D||wall.nativeGpuGate||wall.nativeGpuRepair||wall.nativeGateBinding||entity.id!==wall.entityId||entity.material!==wall.nativeGateMaterial||entity.gate!==true||entity.status!=='intact'||entity.hp!==entity.maxHp||!Number.isFinite(entity.maxHp)||entity.maxHp<=0||!p||!Number.isFinite(p.from)||p.from<=0||p.from>=1||p.to!==1||!Number.isFinite(p.at)||p.at<0||!Number.isFinite(elapsed)||elapsed<p.at||elapsed>=p.at+.48||wall.visual!==p.from||wall.target!==p.from||parts?.length!==2||!parts[0].bridge.leaf||!Number.isFinite(entity.gateOpen)||entity.gateOpen<0||entity.gateOpen>1)
  throw Error('Restored gate Repair source unavailable');
 const opening=entity.gateOpen,visual=wall.visual,[x,z]=parts[0].bridge.leaf.hinge,pivot=uniform(new Vector3(x,0,z));
 const mesh=parts[0].mesh,geometry=mesh.geometry,originalMaterial=mesh.material,originalRaycast=mesh.raycast,originalBounds=geometry.boundingBox,originalSphere=geometry.boundingSphere;
 const material=cloneWebGpuNodeMaterial(originalMaterial);material.userData=originalMaterial.userData;
 let layer,unregister;
 try{
  unregister=parts[0].sourceMaterial?.[structureMaterialReplica]?.(material);
  layer=createGateRepairLayer({parts,material,opening:float(opening),pivot,presentationClock,getPresentationTime,visual,previous:null});
  if(!layer.accept(entity,elapsed))throw Error('Restored gate Repair curve unavailable');
 }catch(error){layer?.dispose();unregister?.();material.dispose();throw error;}
 const proxy=new Mesh(geometry,originalMaterial),rotation=new Matrix4().makeRotationY(-opening*Math.PI/2),hinge=pivot.value;
 proxy.getVertexPosition=(index,out)=>{layer.position(0,index,out);if(parts[0].bridge.leafFlags[index])out.sub(hinge).applyMatrix4(rotation).add(hinge);return out;};
 const raycast=(raycaster,hits)=>{proxy.matrixWorld.copy(mesh.matrixWorld);const found=[];Mesh.prototype.raycast.call(proxy,raycaster,found);for(const hit of found){hit.object=mesh;hits.push(hit);}};
 let closed=false;
 const binding={material,originalMaterial,originalRaycast,originalBounds,originalSphere,raycast,bounds:layer.records[0].bounds,sphere:layer.records[0].sphere,repairLayer:layer,
  current:()=>!closed&&wall.nativeGpuRepair===binding&&!wall.nativeGpuGate&&wall.visual===visual&&wall.parts===parts&&parts.length===2&&layer.records.every((r,i)=>parts[i].mesh===r.mesh&&r.mesh.parent===wall)&&mesh.geometry===geometry&&mesh.material===material&&layer.current(),
  checkEntity(value,at){if(!binding.current()||value.id!==entity.id||value.material!==entity.material||value.gate!==true||value.status!=='intact'||!Number.isFinite(value.hp)||value.maxHp!==entity.maxHp||value.gateOpen!==opening||!layer.accept(value,at))throw Error('Restored gate Repair requires a prepared geometry or motor transition');},
  dispose(){if(closed)return;closed=true;if(wall.nativeGpuRepair===binding)wall.nativeGpuRepair=null;if(mesh.material===material){mesh.material=originalMaterial;mesh.raycast=originalRaycast;geometry.boundingBox=originalBounds;geometry.boundingSphere=originalSphere;}layer.dispose();unregister?.();material.dispose();}
 };
 wall.nativeGpuRepair=binding;mesh.material=material;mesh.raycast=raycast;geometry.boundingBox=binding.bounds;geometry.boundingSphere=binding.sphere;layer.activate();return binding;
}


// The confirmed visual clock drives the 480 ms Repair.
// Successive bindings on the same wall retain this policy and the motor clock.
function createGateRepairLayer({parts,material,opening,pivot,presentationClock,getPresentationTime,visual,previous}){
 if(!presentationClock?.isNode||typeof getPresentationTime!=='function')
  throw Error('Native gate Repair requires a submitted presentation clock');
 const policy=previous?.repairLayer?.policy??{node:uniform(new Vector3(visual,visual,0)),event:null};
 const elapsed=clamp(presentationClock.sub(policy.node.z).div(.48),0,1);
 const amount=mix(policy.node.x,policy.node.y,float(1).sub(float(1).sub(elapsed).pow(3)));
 const ease=value=>{
  const t=clamp(value,0,1);
  return t.mul(t).mul(t).mul(t.mul(t.mul(6).sub(15)).add(10));
 };
 const records=[];
 try{
  for(let i=0;i<parts.length;i++){
   const part=parts[i],mesh=part.mesh,geometry=mesh.geometry;
   const old=previous?.repairLayer?.records[i];
   const isLeaf=i===0;
   for(const name of ['Position','Normal','Root','Peer','Target','TargetNormal']){
    if(geometry.attributes['wgMorph'+name]?.count!==part.bridge.pos.length/3)
     throw Error('Native gate morph basis unavailable');
   }
   const original=old?.original??mesh.material;
   const owned=isLeaf?material:cloneWebGpuNodeMaterial(original);
   owned.userData=original.userData;
   const record={
    mesh,geometry,material:owned,original,prior:mesh.material,
    originalRaycast:old?.originalRaycast??mesh.raycast,priorRaycast:mesh.raycast,
    originalBounds:old?.originalBounds??geometry.boundingBox,priorBounds:geometry.boundingBox,
    originalSphere:old?.originalSphere??geometry.boundingSphere,priorSphere:geometry.boundingSphere
   };
   records.push(record);
   if(!isLeaf)record.unregister=part.sourceMaterial?.[structureMaterialReplica]?.(owned);

   const morph=isLeaf?float(1).sub(amount):amount,t=ease(morph);
   const scale=float(1).sub(ease(t.sub(.5).mul(2))).max(0).sqrt();
   const root=attribute('wgMorphRoot','vec3'),peer=attribute('wgMorphPeer','vec3');
   const source=attribute('wgMorphPosition','vec3'),target=attribute('wgMorphTarget','vec3');
   const baseNormal=attribute('wgMorphNormal','vec3');
   owned.positionNode=Fn(()=>{
    const center=mix(root,peer,t);
    const position=center.add(mix(source,target,t).sub(center).mul(scale));
    const normal=mix(baseNormal,attribute('wgMorphTargetNormal','vec3'),t).toVar();
    If(normal.dot(normal).lessThan(.0001),()=>{normal.assign(baseNormal);});
    if(isLeaf){
     const angle=opening.mul(Math.PI/2).mul(attribute('wgGateLeaf','float'));
     normalLocal.assign(rotate(normal,vec3(0,angle,0)));
     return rotate(position.sub(pivot),vec3(0,angle,0)).add(pivot);
    }
    normalLocal.assign(normal);
    return position;
   })();

   // The intermediate points are convex combinations of the original basis.
   // Bound the whole morph, including leaf rotation, before its first admission.
   record.bounds=new Box3();
   const point=new Vector3();
   let radius=0;
   for(const array of [part.bridge.pos,part.bridge.roots,part.bridge.peers,part.bridge.targets]){
    for(let k=0;k<array.length;k+=3){
     point.fromArray(array,k);
     record.bounds.expandByPoint(point);
     if(isLeaf)radius=Math.max(radius,Math.hypot(point.x-pivot.value.x,point.z-pivot.value.z));
    }
   }
   if(isLeaf){
    const {x,z}=pivot.value;
    record.bounds.expandByPoint(new Vector3(x-radius,record.bounds.min.y,z-radius));
    record.bounds.expandByPoint(new Vector3(x+radius,record.bounds.max.y,z+radius));
   }
   record.sphere=record.bounds.getBoundingSphere(new Sphere());
   if(!isLeaf){
    const proxy=new Mesh(geometry,original);
    proxy.getVertexPosition=(index,out)=>position(i,index,out);
    record.raycast=(raycaster,hits)=>{
     proxy.matrixWorld.copy(mesh.matrixWorld);
     const found=[];
     Mesh.prototype.raycast.call(proxy,raycaster,found);
     for(const hit of found){hit.object=mesh;hits.push(hit);}
    };
   }
  }
 }catch(error){
  for(const record of records.slice(1)){
   record.unregister?.();
   record.material.dispose();
  }
  throw error;
 }

 let active=false,closed=false;
 function sample(at){
  if(!Number.isFinite(at))throw Error('Native gate morph input frame unavailable');
  const curve=policy.node.value;
  const t=Math.max(0,Math.min(1,(at-curve.z)/.48));
  return curve.x+(curve.y-curve.x)*(1-(1-t)**3);
 }
 function position(partIndex,index,out){
  const bridge=parts[partIndex].bridge;
  const visual=sample(getPresentationTime());
  const p=partIndex===0?1-visual:visual;
  const t=p*p*p*(p*(p*6-15)+10);
  const q=Math.max(0,Math.min(1,(t-.5)*2));
  const scale=Math.sqrt(Math.max(0,1-q*q*q*(q*(q*6-15)+10)));
  for(let component=0;component<3;component++){
   const k=index*3+component;
   const center=bridge.roots[k]+(bridge.peers[k]-bridge.roots[k])*t;
   out.setComponent(component,center+(bridge.pos[k]+(bridge.targets[k]-bridge.pos[k])*t-center)*scale);
  }
  return out;
 }
 return {
  policy,records,position,sample,
  accept(entity,at){
   const ratio=entity.hp/entity.maxHp,p=entity.wallPresentation;
   if(!policy.event&&ratio===visual)return !p||p.to===visual&&p.from===visual;
   if(ratio!==1||!Number.isFinite(at))return false;
   if(policy.event){
    const event=policy.event;
    return p?p.from===event.from&&p.to===event.to&&p.at===event.at:at>=event.at+.48;
   }
   if(!p||p.from!==visual||p.to!==1||!Number.isFinite(p.at)||p.at<0||p.at>at)return false;
   policy.event=Object.freeze({from:p.from,to:p.to,at:p.at});
   policy.node.value.set(Math.fround(p.from),1,Math.fround(p.at));
   return true;
  },
  current:()=>active&&!closed&&records.slice(1).every(r=>r.mesh.material===r.material&&r.mesh.geometry===r.geometry),
  capture(record){
   const extra=records.slice(1);
   try{
    for(const stage of extra)stage.mesh.material=stage.material;
    const result=record();
    if(extra.some(stage=>stage.mesh.material!==stage.material))throw Error('Native gate morph capture changed ownership');
    return result;
   }finally{
    for(const stage of extra)stage.mesh.material=stage.prior;
   }
  },
  activate(){
   active=true;
   for(const record of records.slice(1)){
    record.mesh.material=record.material;
    record.mesh.raycast=record.raycast;
    record.geometry.boundingBox=record.bounds;
    record.geometry.boundingSphere=record.sphere;
   }
  },
  rollback(){
   active=false;
   for(const record of records.slice(1)){
    record.mesh.material=record.prior;
    record.mesh.raycast=record.priorRaycast;
    record.geometry.boundingBox=record.priorBounds;
    record.geometry.boundingSphere=record.priorSphere;
   }
  },
  dispose(){
   if(closed)return;
   closed=true;
   for(const record of records.slice(1)){
    if(record.mesh.material===record.material){
     record.mesh.material=record.original;
     record.mesh.raycast=record.originalRaycast;
     record.geometry.boundingBox=record.originalBounds;
     record.geometry.boundingSphere=record.originalSphere;
    }
    record.unregister?.();
    record.material.dispose();
   }
  }
 };
}
