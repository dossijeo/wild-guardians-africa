// Exact-position welding joins UV/normal seams without closing real gaps.
// This is a conservative eligibility audit, not a mesh repair operation.
export function auditSidedness(position,index){
  if(position.length%3||index.length%3)throw new Error('Incomplete triangles');
  const vertices=[],ids=[],weld=new Map(),edges=new Map(),parents=[];
  for(let i=0;i<position.length;i+=3){
    const p=Array.from(position.slice(i,i+3));
    if(!p.every(Number.isFinite))throw new Error('Non-finite position');
    const key=p.join(',');let id=weld.get(key);
    if(id===undefined){id=vertices.length;weld.set(key,id);vertices.push(p);}
    ids.push(id);
  }
  const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  let degenerateTriangles=0;const faces=[];
  for(let i=0;i<index.length;i+=3){
    const f=i/3;parents[f]=f;
    const triangle=Array.from(index.slice(i,i+3),v=>{
      if(!Number.isInteger(v)||v<0||v>=ids.length)throw new Error('Invalid index');
      return ids[v];
    });faces.push(triangle);
    const [a,b,c]=triangle.map(v=>vertices[v]);
    const u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]);
    if(new Set(triangle).size!==3||Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])===0)degenerateTriangles++;
    for(let j=0;j<3;j++){
      const a=triangle[j],b=triangle[(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;
      let edge=edges.get(key);
      if(!edge){edge={count:0,balance:0,face:f};edges.set(key,edge);}
      else parents[root(f)]=root(edge.face);
      edge.count++;edge.balance+=a<b?1:-1;
    }
  }
  let openEdges=0,nonManifoldEdges=0,inconsistentEdges=0;
  for(const edge of edges.values()){
    if(edge.count===1)openEdges++;
    if(edge.count>2)nonManifoldEdges++;
    if(edge.count===2&&edge.balance!==0)inconsistentEdges++;
  }
  const components=new Map();
  faces.forEach((triangle,f)=>{
    const id=root(f);let part=components.get(id);
    if(!part){part={faces:[],origin:vertices[triangle[0]]};components.set(id,part);}
    part.faces.push(triangle);
  });
  const signedVolumes=Array.from(components.values(),part=>{
    let volume=0;
    for(const triangle of part.faces){
      const [a,b,c]=triangle.map(id=>vertices[id].map((v,j)=>v-part.origin[j]));
      volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    }
    return volume;
  });
  const positiveComponents=signedVolumes.filter(v=>v>0).length;
  const closedOutward=faces.length>0&&!degenerateTriangles&&!openEdges&&!nonManifoldEdges&&!inconsistentEdges&&positiveComponents===components.size;
  return {triangles:faces.length,weldedVertices:vertices.length,degenerateTriangles,openEdges,nonManifoldEdges,inconsistentEdges,components:components.size,positiveComponents,signedVolumes,closedOutward};
}
