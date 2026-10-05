import {computeRaidEntry} from './compute-raid-entry.js';
self.onmessage=({data})=>{
  try{self.postMessage(computeRaidEntry(data));}
  catch(error){self.postMessage({key:data.key,token:data.token,error:String(error)});}
};
