import {computeRaidExteriorGeometry} from './raid-exterior-prewarming.js';
import {computeRaidEntry} from './compute-raid-entry.js';
self.onmessage=({data})=>{
  try{self.postMessage(data.kind==='raid-exterior-geometry'?computeRaidExteriorGeometry(data):computeRaidEntry(data));}
  catch(error){self.postMessage({key:data.key,token:data.token,error:String(error)});}
};
