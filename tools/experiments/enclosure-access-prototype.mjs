// QA-only experiment: one exact native-grid accessibility field answers all
// crop service-point questions in a defensive area. A positive answer still
// uses the normal A*; only a proven disconnected grid point is skipped.
export function installEnclosureAccessPrototype(nav,metrics={}){
  const original=nav.approachReachability.bind(nav);
  const fields=[];
  Object.assign(metrics,{fieldsBuilt:0,fieldsReused:0,visitedCells:0,filteredPoints:0,possiblePoints:0,buildMilliseconds:0});
  nav.approachReachability=(start,targets,radius,margin=32)=>{
    if(targets.length<32||!nav.field.canyon&&!nav.obstacles.some(o=>o.kind==='wall'))return original(start,targets,radius,margin);
    let minTX=Infinity,maxTX=-Infinity,minTZ=Infinity,maxTZ=-Infinity;
    for(const t of targets){minTX=Math.min(minTX,t.x);maxTX=Math.max(maxTX,t.x);minTZ=Math.min(minTZ,t.z);maxTZ=Math.max(maxTZ,t.z);}
    const lowX=Math.floor(minTX-4),highX=Math.ceil(maxTX+4),lowZ=Math.floor(minTZ-4),highZ=Math.ceil(maxTZ+4);
    const sx=Math.round(start.x),sz=Math.round(start.z),minX=Math.min(sx,lowX)-margin-2,maxX=Math.max(sx,highX)+margin+2,minZ=Math.min(sz,lowZ)-margin-2,maxZ=Math.max(sz,highZ)+margin+2;
    const width=maxX-minX+1,height=maxZ-minZ+1;
    if(width*height>100000)return null;
    const index=(x,z)=>(z-minZ)*width+x-minX,inside=(x,z)=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ;
    const origin=[];
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=sx+dx,z=sz+dz,p={x,z};
      if(inside(x,z)&&nav.walkable(x,z,radius,null,false)&&nav.segmentClear(start,p,radius,null,false))origin.push(index(x,z));
    }
    let field=fields.find(f=>f.version===nav.version&&f.radius===radius&&f.minX<=minX&&f.maxX>=maxX&&f.minZ<=minZ&&f.maxZ>=maxZ&&origin.length&&origin.every(i=>{
      const x=minX+i%width,z=minZ+Math.floor(i/width);
      return f.seen[(z-f.minZ)*f.width+x-f.minX];
    }));
    if(field)metrics.fieldsReused++;
    else{
      const began=performance.now(),seen=new Uint8Array(width*height),queue=new Int32Array(width*height),walkable=new Int8Array(width*height);let tail=0;
      const pass=(x,z)=>{const i=index(x,z);return walkable[i]||(walkable[i]=nav.walkable(x,z,radius,null,false)?1:-1);};
      for(const i of origin)if(!seen[i]){seen[i]=1;queue[tail++]=i;}
      const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
      for(let head=0;head<tail;head++){
        const i=queue[head],x=minX+i%width,z=minZ+Math.floor(i/width);
        for(const [dx,dz] of directions){
          const nx=x+dx,nz=z+dz;if(!inside(nx,nz))continue;
          const ni=index(nx,nz);if(seen[ni]||pass(nx,nz)!==1)continue;
          if(dx&&dz&&(pass(x+dx,z)!==1||pass(x,z+dz)!==1))continue;
          if(!nav.segmentClear({x,z},{x:nx,z:nz},radius,null,false))continue;
          seen[ni]=1;queue[tail++]=ni;
        }
      }
      field={version:nav.version,radius,minX,maxX,minZ,maxZ,width,seen};
      fields.push(field);if(fields.length>12)fields.shift();
      metrics.fieldsBuilt++;metrics.visitedCells+=tail;metrics.buildMilliseconds+=performance.now()-began;
    }
    return point=>{
      if(point.x<lowX||point.x>highX||point.z<lowZ||point.z>highZ){metrics.possiblePoints++;return true;}
      if(nav.segmentClear(point,start,radius,null,false)){metrics.possiblePoints++;return true;}
      const ex=Math.round(point.x),ez=Math.round(point.z);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const x=ex+dx,z=ez+dz;
        if(x>=field.minX&&x<=field.maxX&&z>=field.minZ&&z<=field.maxZ&&field.seen[(z-field.minZ)*field.width+x-field.minX]){metrics.possiblePoints++;return true;}
      }
      metrics.filteredPoints++;return false;
    };
  };
  return metrics;
}
