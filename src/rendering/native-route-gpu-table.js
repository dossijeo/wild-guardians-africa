import {copyNativeRoutePresentation,NATIVE_ROUTE_PRESENTATION_WIDTH as sourceWidth} from '../world/native-route-presentation.js';
import {ceilFloat32,floorFloat32} from './float32-time.js';

// Five RGBA texels per knot, packed across rows instead of assuming a texture
// can be 16385 pixels high. No route point or terrain interval is discarded.
export const NATIVE_ROUTE_GPU_WIDTH=20;
export const NATIVE_ROUTE_GPU_FIELDS=Object.freeze(['at','x','y','z','distance','phase','yaw','firstRemainingPoint','arrived','runPhase','walkPhase','carryPhase','runDistance','walkDistance','runRemaining','running','currentSpeed']);
export function prepareNativeRouteGpuTable(support){
 if(support?.kind!=='native-route-terrain-support'||support.valid?.()!==true||!Array.isArray(support.actor?.segments))throw TypeError('Native route requires current terrain support');
 const presentation=copyNativeRoutePresentation(support.presentation),{rows:source,startTime:epoch,endTime}=presentation,{segments,startHeight,endHeight}=support.actor;
 if(presentation.executionScope==='unadmitted-desert-gate-candidate'||segments.length>16384||![startHeight,endHeight].every(Number.isFinite)||support.actor.actorId!==String(presentation.nativeRoute.actorId))throw TypeError('Unusable native route support');
 const count=segments.length+1,columns=Math.min(count,256),width=columns*5,height=Math.ceil(count/columns),data=new Float32Array(width*height*4),duration=floorFloat32(endTime-epoch);
 let cursor=0,previous=epoch,x=source[1],y=startHeight,z=source[2];
 function write(row,at,xx,yy,zz,interior){
  while(cursor+sourceWidth<source.length&&source[cursor+sourceWidth]<=interior)cursor+=sourceWidth;
  const next=Math.min(cursor+sourceWidth,source.length-sourceWidth),span=source[next]-source[cursor],fraction=span>0?Math.max(0,Math.min(1,(at-source[cursor])/span)):0;
  const interpolate=column=>source[cursor+column]+(source[next+column]-source[cursor+column])*fraction,offset=row*NATIVE_ROUTE_GPU_WIDTH;
  data.set([ceilFloat32(at-epoch),xx,yy,zz,interpolate(3),interpolate(4),source[cursor+5],source[cursor+6],source[cursor+7],interpolate(8),interpolate(9),interpolate(10),interpolate(11),interpolate(12),interpolate(13),source[cursor+14],source[cursor+15],0,0,0],offset);
  if(!data.subarray(offset,offset+NATIVE_ROUTE_GPU_WIDTH).every(Number.isFinite)||row>0&&data[offset]<=data[offset-NATIVE_ROUTE_GPU_WIDTH])throw TypeError('Native route intervals cannot be represented on GPU');
 }
 for(let i=0;i<segments.length;i++){
  const part=segments[i];
  if(![part.t0,part.t1,part.x0,part.y0,part.z0,part.x1,part.y1,part.z1].every(Number.isFinite)||part.t0!==previous||part.t1<=part.t0||part.t1>endTime||Math.abs(part.x0-x)>1e-8||Math.abs(part.y0-y)>1e-8||Math.abs(part.z0-z)>1e-8)throw TypeError('Discontinuous native terrain support');
  write(i,part.t0,part.x0,part.y0,part.z0,part.t0+(part.t1-part.t0)*.5);previous=part.t1;x=part.x1;y=part.y1;z=part.z1;
 }
 if(previous!==endTime||Math.abs(x-source.at(-sourceWidth+1))>1e-8||Math.abs(y-endHeight)>1e-8||Math.abs(z-source.at(-sourceWidth+2))>1e-8||endTime>epoch&&!segments.length)throw TypeError('Incomplete native terrain support');
 write(count-1,endTime,x,endHeight,z,endTime);
 if(support.valid()!==true)throw Error('Native terrain support changed during preparation');
 return Object.freeze({data,count,columns,width,height,epoch,duration,nativeRoute:presentation.nativeRoute,presentation,start:Object.freeze({at:epoch,x:source[1],y:startHeight,z:source[2]}),end:Object.freeze({at:endTime,x:source.at(-sourceWidth+1),y:endHeight,z:source.at(-sourceWidth+2)})});
}

// Picking/debugging mirrors the packed resource, not a second route executor.
// The preparing worker never advances or publishes positions through this API.
export function sampleNativeRouteGpuTable(table,at){
 if(!Number.isFinite(at)||at<table.epoch)throw TypeError('Invalid native route sample time');
 const raw=floorFloat32(at-table.epoch),margin=Math.fround(Math.max(Math.abs(raw),1)*.000000476837158203125),time=Math.max(0,Math.min(Math.fround(raw-margin),table.duration)),{data,count}=table;
 let low=0,high=count;while(low<high){const middle=Math.floor((low+high)/2);if(data[middle*NATIVE_ROUTE_GPU_WIDTH]<=time)low=middle+1;else high=middle;}
 const index=Math.max(0,low-1),offset=index*NATIVE_ROUTE_GPU_WIDTH,next=Math.min(index+1,count-1)*NATIVE_ROUTE_GPU_WIDTH,span=data[next]-data[offset],fraction=span>0?Math.max(0,Math.min(1,(time-data[offset])/span)):0,result={};
 for(let column=1;column<NATIVE_ROUTE_GPU_FIELDS.length;column++)result[NATIVE_ROUTE_GPU_FIELDS[column]]=[6,7,8,15,16].includes(column)?data[offset+column]:data[offset+column]+(data[next+column]-data[offset+column])*fraction;
 return result;
}
