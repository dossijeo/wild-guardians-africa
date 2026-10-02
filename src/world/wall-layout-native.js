// Generated from original Bastion V4.1 by tools/prepare_wall_layout.py.
export const WALL_UNIT=2.18;
const UNIT=WALL_UNIT,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const gateScale=(material,kind='gate')=>kind==='gate'?({adobe:1.4,piedra:1.4,reforzado:1.6}[material]||1):1;
function pointSegment(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(!l)return dist(p,a);let t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l,0,1);return dist(p,[a[0]+t*dx,a[1]+t*dz]);}
function simplify(points,epsilon=.12){if(points.length<3)return points;let d=0,index=0;for(let i=1;i<points.length-1;i++){let v=pointSegment(points[i],points[0],points.at(-1));if(v>d){d=v;index=i;}}if(d>epsilon){let a=simplify(points.slice(0,index+1),epsilon),b=simplify(points.slice(index),epsilon);return a.slice(0,-1).concat(b);}return[points[0],points.at(-1)];}
function smoothPath(p){if(p.length<3)return p;const out=[p[0]];for(let i=0;i<p.length-1;i++){let a=p[i],b=p[i+1];out.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}out.push(p.at(-1));return out;}
function resample(points){
 if(points.length<2)return[];const d=[0];for(let i=1;i<points.length;i++)d.push(d.at(-1)+dist(points[i-1],points[i]));
 const length=d.at(-1);if(length<.15)return[];const n=Math.min(350,Math.max(1,Math.ceil(length/UNIT))),step=length/n;
 const at=t=>{let j=1;while(j<d.length-1&&d[j]<t)j++;const f=clamp((t-d[j-1])/(d[j]-d[j-1]||1),0,1);return[points[j-1][0]*(1-f)+points[j][0]*f,points[j-1][1]*(1-f)+points[j][1]*f];};
 const slots=[];for(let i=0;i<n;i++){const a=at(i*step),b=at((i+1)*step),chord=dist(a,b);if(chord<.06)continue;slots.push({x:(a[0]+b[0])*.5,z:(a[1]+b[1])*.5,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:chord/UNIT});}return slots;
}

export const nativeWallLayout={
 snap(point){let result=point,min=.95;for(const p of this.pieces){if(p.hp<=0||p.collapse)continue;const c=Math.cos(p.angle),s=Math.sin(p.angle);for(const side of[-1,1]){const q=[p.x+side*c*UNIT*p.scaleX*.5,p.z+side*s*UNIT*p.scaleX*.5],d=dist(point,q);if(d<min){min=d;result=q;}}}return result;}
,
 endpoints(p){const half=UNIT*p.scaleX*.5,dx=Math.cos(p.angle)*half,dz=Math.sin(p.angle)*half;return[[p.x-dx,p.z-dz],[p.x+dx,p.z+dz]];},
 closedFaces(){
  const EPS=.10,cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
  const segs=this.pieces.filter(p=>p.hp>0&&!p.collapse).map(p=>{const [a,b]=this.endpoints(p);return{p,a,b,d:[b[0]-a[0],b[1]-a[1]],cuts:[0,1]};});
  // Split the logical graph at crossings and T junctions. Rendering remains
  // modular; an intersection cannot silently create or delete a visual piece.
  for(let i=0;i<segs.length;i++)for(let j=i+1;j<segs.length;j++){
   const a=segs[i],b=segs[j],den=cross(a.d,b.d),v=[b.a[0]-a.a[0],b.a[1]-a.a[1]];
   if(Math.abs(den)>1e-8){const t=cross(v,b.d)/den,u=cross(v,a.d)/den;if(t>=-1e-6&&t<=1+1e-6&&u>=-1e-6&&u<=1+1e-6){a.cuts.push(clamp(t,0,1));b.cuts.push(clamp(u,0,1));}}
   for(const [s,o]of [[a,b],[b,a]])for(const q of [o.a,o.b]){
    const l=s.d[0]*s.d[0]+s.d[1]*s.d[1];if(l<1e-8)continue;const t=((q[0]-s.a[0])*s.d[0]+(q[1]-s.a[1])*s.d[1])/l;
    if(t>0&&t<1&&pointSegment(q,s.a,s.b)<EPS)s.cuts.push(t);
   }
  }
  const nodes=[],edges=[],edgeKeys=new Set();
  const node=(q)=>{let id=nodes.findIndex(n=>dist(n.q,q)<EPS);if(id<0){id=nodes.length;nodes.push({q,out:[]});}return id;};
  for(const s of segs){
   const ts=s.cuts.sort((a,b)=>a-b).filter((t,i,a)=>i===0||Math.abs(t-a[i-1])>1e-5);
   for(let i=1;i<ts.length;i++){
    const at=t=>[s.a[0]+s.d[0]*t,s.a[1]+s.d[1]*t],u=node(at(ts[i-1])),v=node(at(ts[i]));if(u===v)continue;
    const key=[Math.min(u,v),Math.max(u,v)].join(':');if(edgeKeys.has(key))continue;edgeKeys.add(key);
    const id=edges.length,a={id,from:u,to:v,piece:s.p,twin:id+1,used:false},b={id:id+1,from:v,to:u,piece:s.p,twin:id,used:false};edges.push(a,b);nodes[u].out.push(a);nodes[v].out.push(b);
   }
  }
  for(const n of nodes)n.out.sort((a,b)=>Math.atan2(nodes[a.to].q[1]-n.q[1],nodes[a.to].q[0]-n.q[0])-Math.atan2(nodes[b.to].q[1]-n.q[1],nodes[b.to].q[0]-n.q[0]));
  const faces=[];
  for(const start of edges){
   if(start.used)continue;let edge=start,path=[],valid=false;
   for(let guard=0;guard<=edges.length;guard++){
    if(edge.used){valid=edge.id===start.id;break;}edge.used=true;path.push(edge);
    const out=nodes[edge.to].out,i=out.findIndex(q=>q.id===edge.twin);edge=out[(i-1+out.length)%out.length];
   }
   if(!valid||path.length<3)continue;
   let area=0;for(const e of path){const a=nodes[e.from].q,b=nodes[e.to].q;area+=cross(a,b)*.5;}
   if(area<.6)continue; // Exterior walk is negative; zero-area doubled lines are not enclosures.
   const walked=new Set(path.map(e=>e.id)),boundary=path.filter(e=>!walked.has(e.twin));
   const ids=[...new Set(boundary.map(e=>e.piece.id))];if(ids.length<3)continue;
   const hosts=ids.filter(id=>boundary.some(e=>e.piece.id===id&&pointSegment([e.piece.x,e.piece.z],nodes[e.from].q,nodes[e.to].q)<.025&&dist([e.piece.x,e.piece.z],nodes[e.from].q)>.18&&dist([e.piece.x,e.piece.z],nodes[e.to].q)>.18));
   faces.push({area,ids,hosts,x:Math.min(...path.map(e=>nodes[e.from].q[0])),z:Math.min(...path.map(e=>nodes[e.from].q[1]))});
  }
  faces.sort((a,b)=>a.x-b.x||a.z-b.z||a.area-b.area);return faces;
 },
 ensureAutomaticGates(){
  const byId=new Map(this.pieces.map(p=>[p.id,p]));let added=0;
  for(const face of this.closedFaces()){
   const perimeter=face.ids.map(id=>byId.get(id)),hosts=face.hosts.map(id=>byId.get(id));if(hosts.some(p=>p.kind==='gate'))continue;
   const candidates=hosts.filter(p=>p.kind==='wall'&&p.hp>0&&!p.collapse&&p.scaleX>=.55);
   if(!candidates.length)continue;
   // Canonical geometric order + perimeter count. Never Math.random(), and no
   // dependency on transient frame timing. Existing gates are never moved.
   candidates.sort((a,b)=>Math.round(a.x*1e5)-Math.round(b.x*1e5)||Math.round(a.z*1e5)-Math.round(b.z*1e5)||a.material.localeCompare(b.material)||a.id-b.id);
   const p=candidates[Math.floor(perimeter.length/2)%candidates.length],health=p.hp/p.maxHp;
   p.kind='gate';p.autoGate=true;p.baseScaleX=(p.baseScaleX??p.scaleX);const gs=gateScale(p.material,'gate');p.scaleX=p.baseScaleX*gs;p.scaleY=gs;p.scaleZ=gs;p.maxHp=this.settings.hp[p.material]*.6;p.hp=p.maxHp*health;p.visual=health;delete p._target;added++;
  }
  return added;
 }
};
export {simplify,smoothPath,resample};
