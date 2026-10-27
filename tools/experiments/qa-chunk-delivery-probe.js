export function installChunkDeliveryProbe(world){
 const stream=world.chunkStream,plan=stream.plan,install=stream.install,prepare=stream.prepareAsync,records=[],pending=new Map();
 const key=(epoch,k)=>epoch+':'+k;
 const wrappedPlan=function(desired,force=false){
  const epoch=this.epoch+(force?1:0),at=performance.now(),loaded=this.loaded();
  for(const [id,row] of pending)if(row.epoch!==epoch||!desired.has(row.key)){row.cancelledAt=at;pending.delete(id);}
  for(const [k,job]of desired)if(!loaded.has(k)||this.stale.has(k)){const id=key(epoch,k);if(!pending.has(id)){const row={key:k,epoch,cx:job.cx,cz:job.cz,demandAt:at};pending.set(id,row);records.push(row);}}
  return plan.call(this,desired,force);
 };
 const wrappedInstall=function(job,data){const row=pending.get(key(job.epoch,job.cx+','+job.cz)),at=performance.now();try{const result=install.call(this,job,data);if(row){row.installStart=at;row.installedAt=performance.now();pending.delete(key(job.epoch,row.key));}return result;}catch(error){if(row)row.installFailedAt=performance.now();throw error;}};
 const wrappedPrepare=prepare?function(data,current){const row=pending.get(key(this.epoch,data.cx+','+data.cz));if(row)row.prepareStart=performance.now();return Promise.resolve(prepare.call(this,data,current)).then(value=>{if(row){row.prepareEnd=performance.now();row.prepared=!!value;}return value;});}:null;
 stream.plan=wrappedPlan;stream.install=wrappedInstall;if(prepare)stream.prepareAsync=wrappedPrepare;
 return ()=>{if(stream.plan===wrappedPlan)stream.plan=plan;if(stream.install===wrappedInstall)stream.install=install;if(stream.prepareAsync===wrappedPrepare)stream.prepareAsync=prepare;return {records,pending:[...pending.values()],summary:stream.summary(),scope:'QA demand-to-install wall latency, per epoch/key; cancelled and pending demand retained. Preparation includes scheduler waits. Installation ends after onData returns, not GPU completion.'};};
}
