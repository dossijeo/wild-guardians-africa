import {Box3,Matrix4,Mesh,Sphere,Vector2,Vector3} from 'three';
import {Fn,If,Loop,attribute,clamp,int,mix,normalLocal,rotate,uniform,uniformArray,vec3} from 'three/tsl';
import {copyNativeGatePresentation} from '../world/native-gate-presentation.js';
import {floorFloat32,ceilFloat32} from './float32-time.js';
import {cloneWebGpuNodeMaterial} from './webgpu-clone-node-material.js';
import {structureMaterialReplica} from './structure-material-replica.js';

// One rigid leaf on the existing wall mesh. The existing actor clock is shared
// as data; neither this owner nor its input proxy advances an authoritative motor.
export function createNativeGateGpuBinding({wall,presentation,motion,getPickTime}={}){
 const packet=copyNativeGatePresentation(presentation,presentation),installed=motion?.status?.().installed;
 if(!wall?.isObject3D||wall.entityId!==packet.entityId||wall.nativeGateBinding||!wall.gate||wall.visual!==1||wall.lastStatus!=='intact'||wall.parts?.length!==1||typeof getPickTime!=='function'||!motion?.timeNode?.isNode||JSON.stringify(installed?.nativeRoute)!==JSON.stringify(packet.nativeRoute)||installed.start.at!==packet.startTime||installed.end.at!==packet.endTime)throw Error('Native gate graphics unavailable');
 const part=wall.parts[0],mesh=part.mesh,geometry=mesh.geometry;let previous=wall.nativeGpuGate??null;const original=previous?.originalMaterial??mesh.material,timeNode=motion.timeNode;
 if(!original?.isNodeMaterial||original.positionNode||original.normalNode||geometry.attributes.wgGatePosition?.count!==packet.leafFlags.length||geometry.attributes.wgGateNormal?.count!==packet.leafFlags.length||geometry.attributes.wgGateLeaf?.count!==packet.leafFlags.length||packet.modelId!==({zarzas:1,empalizada:2,reforzado:3}[wall.nativeGateMaterial]))throw Error('Native gate material or geometry unavailable');
 for(let i=0;i<packet.positions.length;i++)if(Math.abs(packet.positions[i]-geometry.attributes.wgGatePosition.array[i])>1e-6)throw Error('Native gate rest geometry mismatch');
 for(let i=0;i<packet.leafFlags.length;i++)if(packet.leafFlags[i]!==geometry.attributes.wgGateLeaf.array[i])throw Error('Native gate leaf partition mismatch');
 const root=new Matrix4().fromArray(packet.rootMatrix),hinge=new Vector3().fromArray(packet.hinge),duration=floorFloat32(packet.endTime-packet.startTime),rows=Array.from({length:6},(_,i)=>{const at=Math.min(i,packet.rows.length/2-1)*2;return new Vector2(ceilFloat32(packet.rows[at]-packet.startTime),Math.fround(packet.rows[at+1]));}),knots=uniformArray(rows,'vec2').setName('nativeGateKnots'),count=uniform(packet.rows.length/2,'int'),pivot=uniform(hinge);
 const opening=Fn(()=>{const value=knots.element(int(0)).y.toVar();Loop({start:1,end:6},({i})=>{If(i.lessThan(count),()=>{const a=knots.element(i.sub(1)),b=knots.element(i),t=clamp(timeNode.sub(a.x).div(b.x.sub(a.x).max(1e-30)),0,1);value.assign(mix(value,b.y,t));});});return value;})();
 const angle=opening.mul(Math.PI/2).mul(attribute('wgGateLeaf','float'));
 const material=cloneWebGpuNodeMaterial(original);material.userData=original.userData;
 material.positionNode=Fn(()=>{normalLocal.assign(rotate(attribute('wgGateNormal','vec3'),vec3(0,angle,0)));return rotate(attribute('wgGatePosition','vec3').sub(pivot),vec3(0,angle,0)).add(pivot);})();
 let unregister;try{unregister=part.sourceMaterial?.[structureMaterialReplica]?.(material);}catch(error){material.dispose();throw error;}
 const originalRaycast=previous?.originalRaycast??mesh.raycast,originalBounds=previous?.originalBounds??geometry.boundingBox.clone(),originalSphere=previous?.originalSphere??geometry.boundingSphere.clone(),bounds=new Box3().setFromBufferAttribute(geometry.attributes.wgGatePosition);
 let radius=0;for(let i=0;i<packet.leafFlags.length;i++)if(packet.leafFlags[i])radius=Math.max(radius,Math.hypot(packet.positions[i*3]-hinge.x,packet.positions[i*3+2]-hinge.z));
 bounds.expandByPoint(new Vector3(hinge.x-radius,bounds.min.y,hinge.z-radius));bounds.expandByPoint(new Vector3(hinge.x+radius,bounds.max.y,hinge.z+radius));const sphere=bounds.getBoundingSphere(new Sphere());
 const proxy=new Mesh(geometry,original),rotation=new Matrix4();let disposed=false,activated=false,committed=false;
 proxy.getVertexPosition=(index,target)=>{target.fromBufferAttribute(geometry.attributes.wgGatePosition,index);if(packet.leafFlags[index])target.sub(hinge).applyMatrix4(rotation).add(hinge);return target;};
 function sample(at){
  if(!Number.isFinite(at)||at<packet.startTime)throw Error('Native gate input frame unavailable');
  const raw=floorFloat32(at-packet.startTime),time=Math.max(0,Math.min(Math.fround(raw-Math.fround(Math.max(Math.abs(raw),1)*.000000476837158203125)),duration));
  let value=rows[0].y;for(let i=1;i<packet.rows.length/2;i++){const a=rows[i-1],b=rows[i],t=Math.max(0,Math.min(1,(time-a.x)/Math.max(1e-30,b.x-a.x)));value=value+(b.y-value)*t;}return value;
 }
 function raycast(raycaster,hits){rotation.makeRotationY(-sample(getPickTime())*Math.PI/2);proxy.matrixWorld.copy(mesh.matrixWorld);const found=[];Mesh.prototype.raycast.call(proxy,raycaster,found);for(const hit of found){hit.object=mesh;hits.push(hit);}}
 function rootCurrent(){wall.updateWorldMatrix(true,true);return mesh.matrixWorld.elements.every((value,i)=>Math.abs(value-root.elements[i])<=1e-5);}
 const binding={material,mesh,originalMaterial:original,originalRaycast,originalBounds,originalSphere,lease:Object.freeze({start:packet.startTime,end:packet.endTime}),nativeRoute:packet.nativeRoute,
  canActivate:()=>!disposed&&!activated&&wall.parts[0]===part&&(wall.nativeGpuGate??null)===previous&&mesh.material===(previous?.material??original)&&rootCurrent(),
  current:()=>!disposed&&activated&&wall.nativeGpuGate===binding&&wall.parts[0]===part&&mesh.material===material&&rootCurrent(),
  checkEntity(entity){if(entity.gate!==true||entity.status!=='intact'||entity.hp!==entity.maxHp||entity.material!==wall.nativeGateMaterial||!binding.current())throw Error('Native gate requires a prepared geometry or lifecycle transition');},
  sampleOpening:sample,
  activate(){if(!binding.canActivate())throw Error('Native gate graphics changed during preparation');activated=true;wall.nativeGpuGate=binding;mesh.material=material;mesh.raycast=raycast;geometry.boundingBox=bounds;geometry.boundingSphere=sphere;},
  commit(){if(committed||!binding.current())throw Error('Native gate publication changed');committed=true;previous=null;},
  rollback(){if(!activated)return;if(committed||wall.nativeGpuGate!==binding)throw Error('Native gate replacement ownership changed');activated=false;wall.nativeGpuGate=previous;mesh.material=previous?.material??original;mesh.raycast=previous?.raycast??originalRaycast;geometry.boundingBox=previous?.bounds??originalBounds;geometry.boundingSphere=previous?.sphere??originalSphere;},
  raycast,bounds,sphere,
  dispose(){if(disposed)return;disposed=true;if(wall.nativeGpuGate===binding){wall.nativeGpuGate=null;mesh.material=original;mesh.raycast=originalRaycast;geometry.boundingBox=originalBounds;geometry.boundingSphere=originalSphere;}unregister?.();material.dispose();}
 };
 if(!binding.canActivate()){binding.dispose();throw Error('Native gate placement does not match its native mechanism');}
 return binding;
}
