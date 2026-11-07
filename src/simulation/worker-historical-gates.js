import {gateSwingPolygon} from '../world/gate-passages.js';
import {sweptFootprintDistance} from '../world/footprints.js';
import {historicalInactiveActor} from './historical-inactive-actors.js';

// Until gates have their own timeline, their visible pose must stay fixed.
// Use the full swing as a conservative exclusion zone around every gate.
export function captureHistoricalGates(game,{maxChecks=100000}={}){
 const read=()=>{
  const gates=(game.structures??[]).filter(item=>item.gate&&item.status!=='ruined');
  return gates.map(gate=>({gate,key:JSON.stringify([gate.x,gate.z,gate.yaw??0,gate.baseScaleX??1,gate.material,gate.status,gate.gateOpen??0]),polygon:gateSwingPolygon(gate)}));
 };
 let initial;try{initial=read();}catch{return {sample(){},certify(){return null;}};}
 let valid=initial.every(({gate,polygon})=>[gate.x,gate.z,gate.yaw??0,gate.baseScaleX??1,gate.gateOpen??0].every(Number.isFinite)&&(gate.baseScaleX??1)>0&&(gate.gateOpen??0)>=0&&(gate.gateOpen??0)<=1&&Array.isArray(polygon)&&polygon.length>=3&&polygon.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.z)));
 const sample=()=>{try{const current=read();if(current.length!==initial.length||current.some((value,index)=>value.gate!==initial[index].gate||value.key!==initial[index].key))valid=false;}catch{valid=false;}};
 return {sample,certify(peers,ticks,start,end){
  sample();if(!valid)return null;if(!initial.length)return 'none';let checks=0;
  for(const actor of peers){if(historicalInactiveActor(actor,ticks,start,end))continue;const segments=actor.segments.length?actor.segments:[{x0:actor.start.x,z0:actor.start.z,x1:actor.end.x,z1:actor.end.z}];for(const segment of segments)for(const {polygon} of initial){if(++checks>maxChecks||sweptFootprintDistance({x:segment.x0,z:segment.z0},{x:segment.x1,z:segment.z1},polygon)<=actor.radius+1e-6)return null;}}
  return 'swing-clear';
 }};
}
