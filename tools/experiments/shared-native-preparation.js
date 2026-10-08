import {NativeFarGpuCancelled} from './prepare-native-far-gpu.js';

// Coalesce only requests admitted in the same JS turn. Never reuse an in-flight
// or completed fence: a later turn can contain entirely different packing.
export class SharedNativePreparation {
 constructor(prepare){
  if(typeof prepare!=='function')throw Error('Invalid shared preparation');
  this.prepare=prepare;this.pending=null;
 }
 request(textures,cancelled=()=>false){
  const required=[...new Set(textures)];
  return new Promise((resolve,reject)=>{
   if(!this.pending){this.pending=[];queueMicrotask(()=>this.flush());}
   this.pending.push({required,cancelled,resolve,reject});
  });
 }
 async flush(){
  const requests=this.pending;this.pending=null;
  try{
   const live=requests.filter(request=>{
    if(!request.cancelled())return true;
    request.reject(new NativeFarGpuCancelled('owner-cancelled'));return false;
   });
   if(!live.length)return;
   const textures=[...new Set(live.flatMap(request=>request.required))];
   const result=await this.prepare(textures,()=>live.every(request=>request.cancelled()));
   // Each subscriber still validates its own captured packing after this fence.
   for(const request of live){
    if(request.cancelled())request.reject(new NativeFarGpuCancelled('owner-cancelled'));
    else request.resolve(result);
   }
  }catch(error){for(const request of requests)request.reject(error);}
 }
}
