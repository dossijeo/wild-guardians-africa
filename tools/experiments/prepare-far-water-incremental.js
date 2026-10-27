// QA candidate: same authoritative queries and Float32 values as the synchronous
// fallback; no resource is attached until preparation has completed.
export function* farWaterUnits(data,field,{batchSize=64,cancelled=()=>false}={}){
 if(!Number.isInteger(batchSize)||batchSize<1)throw new RangeError('Invalid batch size');
 const check=()=>{if(cancelled())throw new DOMException('Obsolete far water','AbortError');};
 check();if(data.water)return data.water;
 if(data.positions.length%3)throw new RangeError('Invalid vertex positions');
 const water=new Float32Array(data.positions.length/3);
 if(!field)return water;
 for(let start=0;start<water.length;start+=batchSize){
  check();const end=Math.min(water.length,start+batchSize);
  for(let i=start;i<end;i++)water[i]=field.waterInfo(data.positions[i*3],data.positions[i*3+2]).inside?1:0;
  yield;
 }
 check();return water;
}
export async function prepareFarWaterIncremental(data,world,cancelled){
 if(data.water)return;
 const field=world.nav?.field,scheduler=world.frameScheduler;
 if(!scheduler)throw new Error('Incremental far-water experiment requires the global scheduler');
 const valid=()=>!cancelled()&&!world.disposed&&world.nav?.field===field;
 // One submission, not one promise per vertex. Output remains privately owned.
 const units=farWaterUnits(data,field,{cancelled:()=>!valid()});
 let result;const work=(function*(){for(;;){const next=units.next();if(next.done){result=next.value;return;}yield;}})();
 await scheduler.submit(work,{valid,priority:30,deadline:performance.now()+250});
 if(!valid())throw new DOMException('Obsolete far water','AbortError');
 data.water=result;
}
