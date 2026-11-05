import {floorFloat32,ceilFloat32} from './float32-time.js';
import {DataTexture, FloatType, NearestFilter, RGBAFormat, Vector3} from 'three';
import {Fn, If, Loop, clamp, float, ivec2, mix, modelWorldMatrixInverse, positionLocal, textureLoad, uniform, vec3, vec4} from 'three/tsl';

const materialOwners=new WeakMap();

// Replays only already-confirmed, timed path segments; it never predicts a
// safe route or owns an actor. A caller must supply a presentation clock and
// freeze it for pauses, invalidations and unavailable state. Coordinates are
// absolute world X/Z; the material's model matrix anchors the initial point.
export function createConfirmedGpuMotion({actorId,clock,maxSegments=64}={}){
 const relative=clock?.motionNode?.isNode===true,clockNode=relative?clock.motionNode:clock,epoch=relative?clock.epoch:0;
 if(typeof actorId!=='string'||!actorId||!clockNode?.isNode||!Number.isFinite(epoch)||epoch<0||!Number.isInteger(maxSegments)||maxSegments<1||maxSegments>256)throw TypeError('Invalid GPU motion configuration');
 const data=new Float32Array(maxSegments*8),path=new DataTexture(data,2,maxSegments,RGBAFormat,FloatType);path.minFilter=NearestFilter;path.magFilter=NearestFilter;path.generateMipmaps=false;path.needsUpdate=true;
 const count=uniform(0,'int'),startTime=uniform(0),endTime=uniform(0),horizon=uniform(0),anchor=uniform(new Vector3()),initialPosition=uniform(new Vector3()),bindings=new Map();
 let sequence=0,disposed=false,installed=null,allowedUntil=null;
 const offset=Fn(()=>{
  const conservativeClock=clockNode.sub(clockNode.abs().max(1).mul(0.000000476837158203125));
  const time=clamp(conservativeClock.sub(startTime),float(0),horizon.min(endTime)).toVar(),position=initialPosition.xz.toVar();
  Loop(maxSegments,({i})=>{If(i.lessThan(count),()=>{const a=textureLoad(path,ivec2(0,i)),b=textureLoad(path,ivec2(1,i));If(time.greaterThanEqual(a.x),()=>{position.assign(mix(a.zw,b.xy,clamp(time.sub(a.x).div(a.y.sub(a.x)),float(0),float(1))));});});});
  const delta=vec3(position.x.sub(anchor.x),float(0),position.y.sub(anchor.z));return modelWorldMatrixInverse.mul(vec4(delta,0)).xyz;
 })();
 function safeTimeAt(at,start){const raw=relative?floorFloat32(Math.max(0,at-epoch)):Math.fround(Math.max(0,at)),margin=Math.fround(Math.max(Math.abs(raw),1)*0.000000476837158203125);return Math.fround(Math.fround(raw-margin)-start);}
 function install(trace,publicationSequence){
  if(disposed)throw Error('GPU motion disposed');if(!Number.isSafeInteger(publicationSequence)||publicationSequence<=sequence)throw Error('Stale motion publication');
  if(!trace||trace.actorId!==actorId||trace.continuous!==true||trace.timed!==true||!Array.isArray(trace.segments)||trace.segments.length>maxSegments)throw TypeError('Unusable confirmed motion trace');
  const {start,end}=trace,valid=p=>p&&[p.at,p.x,p.z].every(Number.isFinite);if(!valid(start)||!valid(end)||start.at<epoch||end.at<start.at||![start.at-epoch,end.at-epoch,end.at-start.at,start.x,start.z].every(value=>Number.isFinite(Math.fround(value)))||end.at>start.at&&Math.fround(end.at-epoch)<=Math.fround(start.at-epoch))throw TypeError('Invalid motion boundaries');
  const safeStart=ceilFloat32(start.at-epoch),safeDuration=floorFloat32(end.at-start.at);if(end.at>start.at&&safeDuration<=0)throw TypeError('Motion duration cannot be represented safely');const next=new Float32Array(data.length);let x=start.x,z=start.z,last=start.at;
  for(const [i,s] of trace.segments.entries()){
   if(!s||![s.x0,s.z0,s.x1,s.z1,s.t0,s.t1].every(Number.isFinite)||s.x0!==x||s.z0!==z||s.t0<last-1e-8||s.t1<=s.t0||s.t1>end.at+1e-8||!Number.isFinite(Math.fround(s.t0-epoch))||!Number.isFinite(Math.fround(s.t1-epoch))||Math.fround(s.t1-epoch)<=Math.fround(s.t0-epoch))throw TypeError('Invalid confirmed motion segment');
   const j=i*8;next[j]=ceilFloat32(s.t0-start.at);next[j+1]=ceilFloat32(s.t1-start.at);next[j+2]=s.x0;next[j+3]=s.z0;next[j+4]=s.x1;next[j+5]=s.z1;if(next[j+1]<=next[j]||!next.slice(j,j+6).every(Number.isFinite)||safeTimeAt(s.t1,safeStart)<=next[j])throw TypeError('Motion cannot be represented safely on GPU');x=s.x1;z=s.z1;last=s.t1;
  }
  if(x!==end.x||z!==end.z)throw TypeError('Motion endpoint differs from confirmed state');
  const replacing=!!installed&&bindings.size>0;if(replacing){if(!Number.isFinite(clockNode.value)||(relative?clock.elapsed!==start.at:clockNode.value!==start.at)||Math.fround(clockNode.value)!==(relative?floorFloat32(start.at-epoch):Math.fround(start.at))||start.at<installed.start.at||start.at>allowedUntil)throw Error('Bound motion replacement is not at the current safe time');const current=sample(start.at);if(current.x!==start.x||current.z!==start.z)throw Error('Bound motion replacement is discontinuous');}
  data.set(next);path.needsUpdate=true;count.value=trace.segments.length;startTime.value=safeStart;endTime.value=safeDuration;horizon.value=endTime.value;if(!replacing){anchor.value.x=start.x;anchor.value.z=start.z;}initialPosition.value.x=start.x;initialPosition.value.z=start.z;sequence=publicationSequence;allowedUntil=end.at;installed=Object.freeze({start:Object.freeze({...start}),end:Object.freeze({...end}),segments:trace.segments.length});return installed;
 }
 function sample(at){if(disposed||!installed||!Number.isFinite(at))throw TypeError('Invalid motion sample');const time=Math.max(0,Math.min(safeTimeAt(at,startTime.value),horizon.value,endTime.value));let x=initialPosition.value.x,z=initialPosition.value.z;for(let i=0;i<count.value;i++){const j=i*8,t0=data[j],t1=data[j+1];if(time>=t0){const t=Math.max(0,Math.min(1,(time-t0)/(t1-t0)));x=data[j+2]+(data[j+4]-data[j+2])*t;z=data[j+3]+(data[j+5]-data[j+3])*t;}}return {x,z,dx:x-anchor.value.x,dz:z-anchor.value.z};}
 function hold(at){if(disposed)throw Error('GPU motion disposed');if(!installed||!Number.isFinite(at)||at<installed.start.at||at>allowedUntil)throw TypeError('Invalid motion hold');horizon.value=floorFloat32(at-installed.start.at);allowedUntil=at;}
 function bind(material){if(disposed)throw Error('GPU motion disposed');if(!material?.isNodeMaterial||material.castShadowPositionNode)throw TypeError('Expected compatible node material');if(bindings.has(material))return material;if(materialOwners.has(material))throw Error('Motion material already owned');const previous=material.positionNode,node=(previous??positionLocal).add(offset);material.positionNode=node;bindings.set(material,{node,previous});materialOwners.set(material,bindings);material.needsUpdate=true;return material;}
 function unbind(material){const binding=bindings.get(material);if(!binding)return false;if(material.positionNode===binding.node){material.positionNode=binding.previous;material.needsUpdate=true;}if(materialOwners.get(material)===bindings)materialOwners.delete(material);bindings.delete(material);return true;}
 return {actorId,install,hold,sample,bind,unbind,get texture(){return path;},status(){return {sequence,disposed,installed,horizon:installed?installed.start.at+horizon.value:null};},dispose(){if(disposed)return;disposed=true;for(const material of [...bindings.keys()])unbind(material);path.dispose();}};
}
