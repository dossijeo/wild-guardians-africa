import {computeRaidExteriorGeometry} from './raid-exterior-prewarming.js';
import {computeRaidEntry} from './compute-raid-entry.js';
const geometryCache=new Map();
self.onmessage=({data})=>{
  if(data.kind==='raid-preparation-job'){
    const started=performance.now(),reply={kind:'raid-preparation-reply',job:data.job,jobKind:data.jobKind,owner:data.owner};
    try{
      if(!Number.isSafeInteger(data.job)||!['entry','geometry'].includes(data.jobKind)||data.request?.owner!==data.owner)throw Error('Invalid shared raid job');
      if(data.jobKind==='geometry'){
        reply.result=computeRaidExteriorGeometry(data.request);if(geometryCache.size>=2)geometryCache.delete(geometryCache.keys().next().value);geometryCache.set(data.request.key,reply.result.geometry);
      }else {const geometry=geometryCache.get(data.request.geometryKey);reply.geometryReused=!!geometry;reply.result=computeRaidEntry(data.request,{preparedGeometry:geometry});}
    }catch(error){reply.error=String(error);}
    reply.computeMs=performance.now()-started;self.postMessage(reply);return;
  }
  try{self.postMessage(data.kind==='raid-exterior-geometry'?computeRaidExteriorGeometry(data):computeRaidEntry(data));}
  catch(error){self.postMessage({key:data.key,token:data.token,error:String(error)});}
};
