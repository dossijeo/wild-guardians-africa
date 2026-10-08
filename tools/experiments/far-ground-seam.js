import {farGroundHeight} from './far-ground-data.js';

// An offline/worker candidate. Each vertical edge joins the exact native
// lattice surface to the already generated proxy, without overlapping either
// horizontal surface. Not connected to the live renderer yet.
export function farGroundSeam(data,nearBounds,{nativeHeightAt,step=1,maxColumns=8192}={}){
 if(typeof nativeHeightAt!=='function'||!Number.isFinite(step)||step<=0||!Number.isInteger(maxColumns)||maxColumns<8||!Array.isArray(nearBounds)||nearBounds.length!==4||!nearBounds.every(Number.isFinite))throw Error('Invalid ground seam inputs');
 const [minX,minZ,maxX,maxZ]=nearBounds,b=data.bounds;
 if(minX>=maxX||minZ>=maxZ||minX<b.minX||maxX>b.maxX||minZ<b.minZ||maxZ>b.maxZ)throw Error('Ground seam outside proxy');
 const edges=[{axis:0,fixed:minX,min:minZ,max:maxZ},{axis:2,fixed:maxZ,min:minX,max:maxX},{axis:0,fixed:maxX,min:minZ,max:maxZ},{axis:2,fixed:minZ,min:minX,max:maxX}],positions=[],indices=[],columns=[],segments=[];
 if(edges.reduce((sum,e)=>sum+Math.floor((e.max-e.min)/step)+1,0)>maxColumns)throw Error('Ground seam column budget exceeded');
 for(const edge of edges){
  const other=edge.axis===0?2:0,knots=new Set([edge.min,edge.max]);
  // Native terrain uses the integer lattice; include every native vertex and
  // every coarse/contact triangle crossing so both edge heights stay linear.
  for(let v=Math.ceil(edge.min/step)*step;v<edge.max;v+=step)knots.add(v);
  for(let i=0;i<data.indices.length;i+=3)for(let k=0;k<3;k++){
   const a=data.indices[i+k]*3,c=data.indices[i+(k+1)%3]*3,pa=data.positions[a+edge.axis],pc=data.positions[c+edge.axis];
   if(pa===pc){if(pa===edge.fixed){for(const offset of [a,c]){const v=data.positions[offset+other];if(v>edge.min&&v<edge.max)knots.add(v);}}continue;}
   const t=(edge.fixed-pa)/(pc-pa);if(t<0||t>1)continue;
   const v=data.positions[a+other]+t*(data.positions[c+other]-data.positions[a+other]);if(v>edge.min&&v<edge.max)knots.add(v);
   if(columns.length+knots.size>maxColumns)throw Error('Ground seam column budget exceeded');
  }
  const sorted=[...knots].sort((a,c)=>a-c).filter((v,i,a)=>!i||v-a[i-1]>1e-7),first=columns.length;
  if(columns.length+sorted.length>maxColumns)throw Error('Ground seam column budget exceeded');
  for(const v of sorted){
   const x=edge.axis===0?edge.fixed:v,z=edge.axis===2?edge.fixed:v,y=nativeHeightAt(x,z),farY=farGroundHeight(data,x,z);
   if(!Number.isFinite(y)||!Number.isFinite(farY))throw Error('Invalid ground seam height');
   positions.push(x,y,z,x,farY,z);columns.push({x,z,nativeY:y,farY});
  }
  for(let i=first;i<columns.length-1;i++){const a=i*2,c=a+2;indices.push(a,a+1,c,c,a+1,c+1);}
  segments.push({first,count:sorted.length,axis:edge.axis,fixed:edge.fixed});
 }
 return {positions:new Float32Array(positions),indices:new Uint32Array(indices),columns,segments,nearBounds:[...nearBounds]};
}
