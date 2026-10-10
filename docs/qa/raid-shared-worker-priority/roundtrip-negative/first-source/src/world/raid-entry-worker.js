import {computeRaidExteriorGeometry,computeRaidExteriorGeometrySteps} from './raid-exterior-prewarming.js';
import {computeRaidEntry} from './compute-raid-entry.js';
import {createRaidWorkerGeometryScheduler} from './raid-worker-geometry-scheduler.js';
const geometryCache=new Map();
const scheduler=createRaidWorkerGeometryScheduler({steps:computeRaidExteriorGeometrySteps,computeEntry:computeRaidEntry,getGeometry:key=>geometryCache.get(key),cacheGeometry:(key,value)=>{if(geometryCache.size>=2)geometryCache.delete(geometryCache.keys().next().value);geometryCache.set(key,value);},post:data=>self.postMessage(data)});
self.onmessage=({data})=>{
  if(scheduler.handle(data)!==false)return;
  try{self.postMessage(data.kind==='raid-exterior-geometry'?computeRaidExteriorGeometry(data):computeRaidEntry(data));}
  catch(error){self.postMessage({key:data.key,token:data.token,error:String(error)});}
};
