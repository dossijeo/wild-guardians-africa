import {ceilFloat32} from '../float32-time.js';

// Exact Float32 resource projection; never a physical or time permission.
export function nativeMotionPresentationMatches(prepared,actual,gateIds){
 if(['motionMode','motionFlags','profile','radius'].some(key=>actual[key]!==prepared[key])||actual.rows.length!==prepared.rows.length||actual.gates.length!==prepared.gates.length)return false;
 for(let i=0;i<actual.rows.length;i++)if((i%16?Math.fround(actual.rows[i]):ceilFloat32(actual.rows[i]-actual.startTime))!==(i%16?Math.fround(prepared.rows[i]):ceilFloat32(prepared.rows[i]-prepared.startTime)))return false;
 return actual.gates.every((gate,i)=>{const old=prepared.gates[i];return gateIds.includes(gate.gateId)&&['gateId','entityId','mechanism','modelId'].every(key=>gate[key]===old[key])&&['rootMatrix','hinge','positions','leafFlags'].every(key=>gate[key].length===old[key].length&&gate[key].every((v,j)=>Object.is(v,old[key][j])))&&gate.rows.length===old.rows.length&&gate.rows.every((v,j)=>(j%2?Math.fround(v):ceilFloat32(v-actual.startTime))===(j%2?Math.fround(old.rows[j]):ceilFloat32(old.rows[j]-prepared.startTime)));});
}
