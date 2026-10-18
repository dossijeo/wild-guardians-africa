import {performance} from 'node:perf_hooks';
import {retireFarmHistory} from '../src/simulation/retire-farm-history.js';

const historical=Number(process.argv[2]??20000),living=Number(process.argv[3]??500);
const state={
  plants:[...Array.from({length:historical},(_,i)=>({id:`crop-${i}`,species:'mijo',x:i,z:0,alive:false,growth:140,water:[{status:'manual'}]})),
    ...Array.from({length:living},(_,i)=>({id:`live-${i}`,species:'mijo',x:i,z:1,alive:true,growth:30,water:[{status:'due'}]}))],
  crates:Array.from({length:historical},(_,i)=>({id:`crate-${i}`,sourcePlantId:`crop-${i}`,species:'mijo',x:i,z:0,delivered:true,value:{n:'9',d:'1'}})),
  spells:[]
};
const before=Buffer.byteLength(JSON.stringify(state));
const start=performance.now();retireFarmHistory(state);
const retirementMs=performance.now()-start,after=Buffer.byteLength(JSON.stringify(state));
console.log(JSON.stringify({historical,living,beforeBytes:before,afterBytes:after,
  reductionPercent:Number(((1-after/before)*100).toFixed(2)),retirementMs:Number(retirementMs.toFixed(2)),
  remainingPlants:state.plants.length,remainingCrates:state.crates.length},null,2));
