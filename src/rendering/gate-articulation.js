const fields=[['pos',3],['normal',3],['uv',2],['roots',3],['peers',3],['targets',3],['targetNormals',3]];
function clip(vertices,axis,bound,inside){
  const result=[];
  for(let i=0;i<vertices.length;i++){
    const a=vertices[i],b=vertices[(i+1)%vertices.length],da=(a[axis]-bound)*inside,db=(b[axis]-bound)*inside;
    if(da>=0)result.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);result.push(a.map((v,k)=>v+(b[k]-v)*t));}
  }
  return result;
}
export function partitionGateTriangle(vertices,leaf){
  let remaining=vertices;const frame=[];
  for(const [axis,bound,inside] of [[0,leaf.left,1],[0,leaf.right,-1],[1,leaf.top,-1]]){
    const outside=clip(remaining,axis,bound,-inside);if(outside.length>=3)frame.push(outside);
    remaining=clip(remaining,axis,bound,inside);if(remaining.length<3)break;
  }
  return {frame,leaf:remaining.length>=3?remaining:[]};
}
export function splitGateBridge(source,leaf){
  const result=Object.fromEntries(fields.map(([key])=>[key,[]])),flags=[];
  for(let start=0;start<source.pos.length/3;start+=3){
    const vertices=[0,1,2].map(j=>fields.flatMap(([key,size])=>[...source[key].subarray((start+j)*size,(start+j+1)*size)]));
    const parts=partitionGateTriangle(vertices,leaf);
    for(const [polygon,isLeaf] of [...parts.frame.map(p=>[p,0]),[parts.leaf,1]]){
      for(let i=1;i<polygon.length-1;i++)for(const vertex of [polygon[0],polygon[i],polygon[i+1]]){
        let offset=0;for(const [key,size] of fields){result[key].push(...vertex.slice(offset,offset+size));offset+=size;}flags.push(isLeaf);
      }
    }
  }
  for(const [key] of fields)result[key]=new Float32Array(result[key]);
  return {...result,leafFlags:new Uint8Array(flags),leaf,lastMorph:NaN,morphed:null};
}
export function articulateGate(bridge,amount,positions,normals){
  const result=positions.slice();if(!bridge.leafFlags||!amount)return result;
  const angle=Math.max(0,Math.min(1,amount))*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle),[hx,hz]=bridge.leaf.hinge;
  for(let i=0;i<bridge.leafFlags.length;i++)if(bridge.leafFlags[i]){
    const at=i*3,x=result[at]-hx,z=result[at+2]-hz;result[at]=hx+x*c-z*s;result[at+2]=hz+x*s+z*c;
    const nx=normals[at],nz=normals[at+2];normals[at]=nx*c-nz*s;normals[at+2]=nx*s+nz*c;
  }
  return result;
}
