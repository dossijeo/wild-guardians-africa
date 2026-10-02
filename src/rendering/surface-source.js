// Generated from Bioma Lab V4.0 by tools/prepare_surface.py.
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], norm=a=>mul(a,1/(Math.hypot(...a)||1));
function computeTangents(p,n,uv,index){
 const count=p.length/3,t=new Float32Array(count*3),b=new Float32Array(count*3),out=new Float32Array(count*4);
 for(let k=0;k<index.length;k+=3){const a=index[k],c=index[k+1],d=index[k+2],a3=a*3,c3=c*3,d3=d*3;
  const ex=p[c3]-p[a3],ey=p[c3+1]-p[a3+1],ez=p[c3+2]-p[a3+2],fx=p[d3]-p[a3],fy=p[d3+1]-p[a3+1],fz=p[d3+2]-p[a3+2];
  const s1=uv[c*2]-uv[a*2],s2=uv[d*2]-uv[a*2],t1=uv[c*2+1]-uv[a*2+1],t2=uv[d*2+1]-uv[a*2+1],det=s1*t2-s2*t1;if(Math.abs(det)<1e-10)continue;
  const r=1/det,tx=(ex*t2-fx*t1)*r,ty=(ey*t2-fy*t1)*r,tz=(ez*t2-fz*t1)*r,bx=(fx*s1-ex*s2)*r,by=(fy*s1-ey*s2)*r,bz=(fz*s1-ez*s2)*r;
  for(const j of[a3,c3,d3]){t[j]+=tx;t[j+1]+=ty;t[j+2]+=tz;b[j]+=bx;b[j+1]+=by;b[j+2]+=bz;}
 }
 for(let i=0;i<count;i++){const j=i*3,k=i*4,nn=norm([n[j],n[j+1],n[j+2]]),tt=[t[j],t[j+1],t[j+2]],tangent=norm(sub(tt,mul(nn,dot(nn,tt))));
  if(Math.hypot(...tangent)<.01)tangent.splice(0,3,...norm(cross(Math.abs(nn[1])>.9?[1,0,0]:[0,1,0],nn)));
  out[k]=tangent[0];out[k+1]=tangent[1];out[k+2]=tangent[2];out[k+3]=dot(cross(nn,tangent),[b[j],b[j+1],b[j+2]])<0?-1:1;
 }return out;
}
function assetScaleIssues(prototypes){
 const issues=[];
 for(let i=0;i<prototypes.length;i++){
  const p=prototypes[i],h=p.size[1],span=Math.max(...p.size),g=p.group??SLOTS[i].g;
  const limits=p.role==='formation'?[2,70]:g===0?[2,35]:g===1?[.25,8]:g===2?[.05,4]:[.25,22];
  const value=g<3?h:span;
  if(!Number.isFinite(value)||value<limits[0]||value>limits[1])issues.push(SLOTS[i].id+' ('+p.name+'): '+value.toFixed(3)+' m');
 }
 return issues;
}
function describeSurface(p,kind,biome){
 if(kind===1)return{name:biome==='volcanoes'?'Lava emisiva':'Agua con Fresnel',type:8,params:[.22,0,0,1]};
 if(!p){const names={savanna:'Tierra seca y hierba',grand_river:'Limo y suelo de ribera',mangrove:'Barro húmedo y musgo',volcanoes:'Basalto y ceniza',canyons:'Arenisca estratificada',desert:'Arena mate con microondulaciones'};return{name:names[biome]||'Suelo',type:0,params:[.9,0,0,biome==='mangrove'?.7:0]};}
 const group=p.group,name=p.name.toLowerCase(),wet=biome==='mangrove'?.52:biome==='grand_river'?.20:0;
 if(/hues|óse|ose|cráneo|concha/.test(name))return{name:'Hueso / concha mate',type:4,params:[.69,0,0,wet]};
 if(group<=2)return{name:group===0?'Corteza y hojas':group===1?'Follaje arbustivo':'Hierba y hojas bajas',type:1,params:[group===0?.87:.76,0,1,wet]};
 if(group===3||p.role==='formation'||/roca|piedra|mesa|aguja|arco|termitero/.test(name))return{name:biome==='volcanoes'?'Roca volcánica':'Piedra natural',type:2,params:[.88,0,0,wet]};
 if(group===4||/madera|pilote|refugio|embarcadero|barca/.test(name))return{name:'Madera y restos orgánicos',type:3,params:[.86,0,0,wet]};
 return{name:'Piedra y construcción',type:5,params:[.87,0,.35,wet]};
}
export const SURFACE_SOURCE_SHA256="c1eaa6a1fa947b53110bacc5d776672159217350d40ded570b7f53fd85591ebe";
export {computeTangents,describeSurface};
