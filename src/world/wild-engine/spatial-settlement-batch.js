export function validWaterFalloff(site){return site.waterFalloff===undefined||Number.isFinite(site.waterFalloff)&&site.waterFalloff>=.25&&site.waterFalloff<=6;}
export function applySpatialSettlementBatch(wasm,sites,{replace=false}={}){
 if(!Array.isArray(sites)||sites.length>256||typeof replace!=='boolean'||sites.some(s=>!s||![s.x,s.z,s.hx,s.hz].every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))||s.hx<=0||s.hz<=0||s.hx>100||s.hz>100||!validWaterFalloff(s)))throw TypeError('Invalid settlement batch');
 const ptr=wasm.spatial_settlement_batch_ptr(),input=new Float32Array(wasm.memory.buffer,ptr,sites.length*5);
 sites.forEach((s,i)=>input.set([s.x,s.z,s.hx,s.hz,s.waterFalloff??6],i*5));
 const count=wasm.spatial_apply_settlement_batch(sites.length,replace?1:0);
 if(count!==sites.length)throw Error('Could not apply settlement batch');return count;
}
