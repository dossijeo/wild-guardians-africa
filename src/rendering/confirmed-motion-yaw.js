import {Quaternion,Vector3} from 'three';

// Confirmed tick observations are mandatory; missing yaw is not a direction.
export function confirmedMotionYaw(preview,actorId,root){
 const ticks=preview?.trace?.actorTickStates;if(!ticks?.complete||!Array.isArray(ticks.actors)||!root?.isObject3D)return null;
 const records=ticks.actors.filter(entry=>entry.actorId===actorId);if(records.length!==1||!Array.isArray(records[0].samples))return null;
 const samples=records[0].samples;if(samples.length<2||samples[0].at!==preview.start||samples.at(-1).at!==preview.end||samples.some((sample,index)=>!Number.isFinite(sample.at)||!Number.isFinite(sample.yaw)||index&&sample.at<=samples[index-1].at))return null;
 root.updateWorldMatrix(true,false);const direction=new Vector3(0,0,1).applyQuaternion(root.getWorldQuaternion(new Quaternion())),yaw=Math.atan2(direction.x,direction.z),difference=Math.atan2(Math.sin(yaw-samples[0].yaw),Math.cos(yaw-samples[0].yaw));if(Math.abs(difference)>1e-6)return null;
 return samples.map(({at,yaw})=>({at,yaw}));
}
