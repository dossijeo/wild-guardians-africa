// Offline conservative shortlist. Closed topology is not visual approval for FrontSide.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export function auditMeshSidedness(positions,indices,{stride=3,start=0,count=indices.length,tolerance=1e-5}={}){
  assert.ok(count%3===0&&start>=0&&start+count<=indices.length);
  const vertices=[],welded=new Map(),edges=new Map(),triangles=[],parents=[];
  const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const vertex=i=>{
    const p=[positions[i*stride],positions[i*stride+1],positions[i*stride+2]];
    assert.ok(p.every(Number.isFinite),'Invalid indexed position');
    const key=p.map(x=>Math.round(x/tolerance)).join(',');
    let id=welded.get(key);if(id===undefined){id=vertices.length;welded.set(key,id);vertices.push(p);parents.push(id);}return id;
  };
  let degenerates=0;
  for(let i=start;i<start+count;i+=3){
    const ids=[vertex(indices[i]),vertex(indices[i+1]),vertex(indices[i+2])];
    if(new Set(ids).size<3){degenerates++;continue;}
    const [a,b,c]=ids.map(id=>vertices[id]);
    const u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]);
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if(Math.hypot(...cross)<=tolerance*tolerance){degenerates++;continue;}
    for(const [a,b] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){
      parents[root(b)]=root(a);
      const key=a<b?`${a},${b}`:`${b},${a}`,edge=edges.get(key)??{count:0,direction:0};
      edge.count++;edge.direction+=a<b?1:-1;edges.set(key,edge);
    }
    triangles.push(ids);
  }
  let boundaryEdges=0,nonManifoldEdges=0,inconsistentEdges=0;
  for(const edge of edges.values()){
    if(edge.count===1)boundaryEdges++;else if(edge.count!==2)nonManifoldEdges++;
    if(edge.count===2&&edge.direction!==0)inconsistentEdges++;
  }
  const volumes=new Map();
  for(const ids of triangles){
    const [a,b,c]=ids.map(id=>vertices[id]),volume=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    const id=root(ids[0]);volumes.set(id,(volumes.get(id)??0)+volume);
  }
  const componentVolumes=[...volumes.values()];
  const nonPositiveComponents=componentVolumes.filter(v=>v<=tolerance**3).length;
  return {triangles:count/3,weldedVertices:vertices.length,components:componentVolumes.length,boundaryEdges,nonManifoldEdges,inconsistentEdges,degenerates,nonPositiveComponents,
    candidateClosed:count>0&&!boundaryEdges&&!nonManifoldEdges&&!inconsistentEdges&&!degenerates&&!nonPositiveComponents};
}

function selfCheck(){
  const p=[0,0,0,1,0,0,1,1,0,0,1,0,0,0,1,1,0,1,1,1,1,0,1,1];
  const cube=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5];
  assert.equal(auditMeshSidedness(p,cube).candidateClosed,true);
  assert.equal(auditMeshSidedness(p,cube.map((_,i)=>cube[i-i%3+2-i%3])).candidateClosed,false);
  const plane=auditMeshSidedness(p,[0,1,2,0,2,3]);assert.equal(plane.boundaryEdges,4);assert.equal(plane.candidateClosed,false);
  assert.equal(auditMeshSidedness(p,[0,1,2,2,1,0]).candidateClosed,false);
  const shared=new Float32Array(p.flatMap((_,i)=>i%3===0?[...p.slice(i,i+3),0,0,1,0,0]:[]));
  assert.equal(auditMeshSidedness(shared,cube,{stride:8}).candidateClosed,true);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  selfCheck();
  const output=resolve(process.argv[2]??'.cache/mesh-sidedness/report.json');
  const sources={},rows=[],sha=b=>createHash('sha256').update(b).digest('hex');
  const read=path=>{const b=readFileSync(path);sources[path]=sha(b);return b;};
  const local=url=>resolve('public',url.replace(/^\//,''));
  for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
    const pack=JSON.parse(read(`public/content/biome-${biome}.json`));const binary=read(local(pack.binary.url));
    const types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array};
    const attr=d=>new types[d.type](binary.buffer,binary.byteOffset+d.offset,d.count);
    for(const asset of pack.assets)for(const [level,lod] of asset.lods.entries())rows.push({kind:'biome-prop',biome,slot:asset.slot,name:asset.name,level,...auditMeshSidedness(attr(lod.position),attr(lod.index))});
  }
  for(const village of JSON.parse(read('public/content/villages.json'))){
    const binary=read(local(village.binary.url)),positions=new Float32Array(binary.buffer,binary.byteOffset,village.vertexBytes/4),index=new Uint32Array(binary.buffer,binary.byteOffset+village.vertexBytes,village.indexCount);
    for(const unit of village.units)rows.push({kind:'village-unit',culture:village.id,name:unit.name,key:unit.key,...auditMeshSidedness(positions,index,{stride:8,start:unit.offset,count:unit.count})});
  }
  const report={scope:'Offline welded topology shortlist at tolerance 1e-5. No runtime material change, geometry repair, performance/FPS claim or visual approval. Closedness is a conservative filter, not a universal requirement or approval for FrontSide: validate normals, alpha/silhouette/interiors, camera angles, shadows and damage separately.',selfChecks:5,sources,rows};
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({rows:rows.length,candidateClosed:rows.filter(r=>r.candidateClosed).length,output}));
}
