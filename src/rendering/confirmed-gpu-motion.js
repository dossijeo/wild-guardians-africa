import {DataTexture, FloatType, NearestFilter, RGBAFormat, Vector3} from 'three';
import {Fn, If, Loop, clamp, float, ivec2, mix, modelWorldMatrixInverse, positionLocal, textureLoad, uniform, vec3, vec4} from 'three/tsl';

const materialOwners=new WeakMap();

// Replays only already-confirmed, timed path segments; it never predicts a
// safe route or owns an actor. A caller must supply a presentation clock and
// freeze it for pauses, invalidations and unavailable state. Coordinates are
// absolute world X/Z; the material's model matrix anchors the initial point.
export function createConfirmedGpuMotion({actorId,clock,maxSegments=64}={}){
 if(typeof actorId!=='string'||!actorId||!clock?.isNode||!Number.isInteger(maxSegments)||maxSegments<1||maxSegments>256)throw TypeError('Invalid GPU motion configuration');
 const data=new Float32Array(maxSegments*8),path=new DataTexture(data,2,maxSegments,RGBAFormat,FloatType);path.minFilter=NearestFilter;path.magFilter=NearestFilter;path.generateMipmaps=false;path.needsUpdate=true;
 const count=uniform(0,'int'),startTime=uniform(0),endTime=uniform(0),horizon=uniform(0),anchor=uniform(new Vector3()),bindings=new Map();
 let sequence=0,disposed=false,installed=null;
 const offset=Fn(()=>{
  const time=clamp(clock.sub(startTime),float(0),horizon.min(endTime)).toVar(),position=anchor.xz.toVar();
  Loop(maxSegments,({i})=>{If(i.lessThan(count),()=>{const a=textureLoad(path,ivec2(0,i)),b=textureLoad(path,ivec2(1,i));If(time.greaterThanEqual(a.x),()=>{position.assign(mix(a.zw,b.xy,clamp(time.sub(a.x).div(a.y.sub(a.x)),float(0),float(1))));});});});
  const delta=vec3(position.x.sub(anchor.x),float(0),position.y.sub(anchor.z));return modelWorldMatrixInverse.mul(vec4(delta,0)).xyz;
 })();
 function install(trace,publicationSequence){
  if(disposed)throw Error('GPU motion disposed');if(!Number.isSafeInteger(publicationSequence)||publicationSequence<=sequence)throw Error('Stale motion publication');
  if(!trace||trace.actorId!==actorId||trace.continuous!==true||trace.timed!==true||!Array.isArray(trace.segments)||trace.segments.length>maxSegments)throw TypeError('Unusable confirmed motion trace');
  const {start,end}=trace,valid=p=>p&&[p.at,p.x,p.z].every(Number.isFinite);if(!valid(start)||!valid(end)||start.at<0||end.at<start.at||![start.at,end.at,end.at-start.at,start.x,start.z].every(value=>Number.isFinite(Math.fround(value)))||end.at>start.at&&Math.fround(end.at)<=Math.fround(start.at))throw TypeError('Invalid motion boundaries');
  const next=new Float32Array(data.length);let x=start.x,z=start.z,last=start.at;
  for(const [i,s] of trace.segments.entries()){
   if(!s||![s.x0,s.z0,s.x1,s.z1,s.t0,s.t1].every(Number.isFinite)||s.x0!==x||s.z0!==z||s.t0<last-1e-8||s.t1<=s.t0||s.t1>end.at+1e-8||!Number.isFinite(Math.fround(s.t0))||!Number.isFinite(Math.fround(s.t1))||Math.fround(s.t1)<=Math.fround(s.t0))throw TypeError('Invalid confirmed motion segment');
   const j=i*8;next[j]=s.t0-start.at;next[j+1]=s.t1-start.at;next[j+2]=s.x0;next[j+3]=s.z0;next[j+4]=s.x1;next[j+5]=s.z1;if(next[j+1]<=next[j]||!next.slice(j,j+6).every(Number.isFinite))throw TypeError('Motion cannot be represented on GPU');x=s.x1;z=s.z1;last=s.t1;
  }
  if(x!==end.x||z!==end.z)throw TypeError('Motion endpoint differs from confirmed state');
  data.set(next);path.needsUpdate=true;count.value=trace.segments.length;startTime.value=start.at;endTime.value=end.at-start.at;horizon.value=endTime.value;anchor.value.x=start.x;anchor.value.z=start.z;sequence=publicationSequence;installed={start:{...start},end:{...end},segments:trace.segments.length};return installed;
 }
 function sample(at){if(disposed||!installed||!Number.isFinite(at))throw TypeError('Invalid motion sample');const time=Math.max(0,Math.min(Math.fround(at)-Math.fround(startTime.value),horizon.value,endTime.value));let x=anchor.value.x,z=anchor.value.z;for(let i=0;i<count.value;i++){const j=i*8,t0=data[j],t1=data[j+1];if(time>=t0){const t=Math.max(0,Math.min(1,(time-t0)/(t1-t0)));x=data[j+2]+(data[j+4]-data[j+2])*t;z=data[j+3]+(data[j+5]-data[j+3])*t;}}return {x,z,dx:x-anchor.value.x,dz:z-anchor.value.z};}
 function hold(at){if(disposed)throw Error('GPU motion disposed');if(!installed||!Number.isFinite(at)||at<installed.start.at||at>installed.end.at||at-installed.start.at>horizon.value+1e-8)throw TypeError('Invalid motion hold');horizon.value=at-installed.start.at;}
 function bind(material){if(disposed)throw Error('GPU motion disposed');if(!material?.isNodeMaterial||material.castShadowPositionNode)throw TypeError('Expected compatible node material');if(bindings.has(material))return material;if(materialOwners.has(material))throw Error('Motion material already owned');const previous=material.positionNode,node=(previous??positionLocal).add(offset);material.positionNode=node;bindings.set(material,{node,previous});materialOwners.set(material,bindings);material.needsUpdate=true;return material;}
 function unbind(material){const binding=bindings.get(material);if(!binding)return false;if(material.positionNode===binding.node){material.positionNode=binding.previous;material.needsUpdate=true;}if(materialOwners.get(material)===bindings)materialOwners.delete(material);bindings.delete(material);return true;}
 return {actorId,install,hold,sample,bind,unbind,get texture(){return path;},status(){return {sequence,disposed,installed,horizon:installed?installed.start.at+horizon.value:null};},dispose(){if(disposed)return;disposed=true;for(const material of [...bindings.keys()])unbind(material);path.dispose();}};
}
