export function patchIncrementalFarWater(source,name){
 const replace=(from,to)=>{if(!source.includes(from))throw Error('Patch anchor missing: '+name);source=source.replace(from,to);};
 if(name==='native-far-layer.js'){
  replace("try{loadingSyncWitness(this.onPrepare,'far-region-attach-ground',()=>this.attachData(candidate,result.data,()=>this.closed||epoch!==this.epoch));", "try{await loadingAwaitWitness(this.onPrepare,'far-region-attach-ground',()=>this.attachData(candidate,result.data,()=>this.closed||epoch!==this.epoch));");
 }else if(name==='attach-native-far-world.js'){
  source="import {prepareFarWaterIncremental} from '/tools/experiments/prepare-far-water-incremental.js';\n"+source;
  replace('attachData:(p,data,cancelled)=>{if(data.ground)attachNativeFarGround', 'attachData:async(p,data,cancelled)=>{if(data.ground&&world.biomeGround&&!simplifiedFarGround)await prepareFarWaterIncremental(data.ground,world,()=>cancelled()||isCancelled());if(cancelled()||isCancelled())return;if(data.ground)attachNativeFarGround');
 }else throw Error('Unsupported incremental far water module '+name);
 return source;
}
