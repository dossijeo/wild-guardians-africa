// Checks only the proposed *visual* interpolation. This does not replace
// authority collision checks, prove animated mesh bounds or predict movement.
export function certifyHistoricalSeparation(actors,start,end,{maxActors=256,maxPieces=8192,maxComparisons=100000}={}){
 if(!Array.isArray(actors)||actors.length>maxActors||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return false;
 const all=[],ids=new Set();let pieces=0;
 for(const actor of actors){if(typeof actor?.actorId!=='string'||ids.has(actor.actorId)||actor.continuous!==true||actor.timed!==true||!Number.isFinite(actor.radius)||actor.radius<=0||actor.start?.at!==start||actor.end?.at!==end||![actor.start.x,actor.start.z,actor.end.x,actor.end.z].every(Number.isFinite)||!Array.isArray(actor.segments))return false;ids.add(actor.actorId);const path=[];let t=start,x=actor.start.x,z=actor.start.z;
  const add=(t0,t1,x0,z0,x1,z1)=>{if(++pieces>maxPieces)return false;path.push({t0,t1,x0,z0,x1,z1});return true;};
  for(const s of actor.segments){if(![s?.t0,s?.t1,s?.x0,s?.z0,s?.x1,s?.z1].every(Number.isFinite)||s.t0<t||s.t1<=s.t0||s.t1>end||s.x0!==x||s.z0!==z)return false;if(s.t0>t&&!add(t,s.t0,x,z,x,z))return false;if(!add(s.t0,s.t1,x,z,s.x1,s.z1))return false;t=s.t1;x=s.x1;z=s.z1;}
  if(x!==actor.end.x||z!==actor.end.z)return false;if(t<end&&!add(t,end,x,z,x,z))return false;all.push({radius:actor.radius,path});
 }
 let checked=0;for(let a=0;a<all.length;a++)for(let b=a+1;b<all.length;b++){const p=all[a],q=all[b],limit=p.radius+q.radius+1e-6;let i=0,j=0;while(i<p.path.length&&j<q.path.length){if(++checked>maxComparisons)return false;const x=p.path[i],y=q.path[j],lo=Math.max(x.t0,y.t0),hi=Math.min(x.t1,y.t1);if(hi>=lo){const value=(s,at,key)=>s[key+'0']+(s[key+'1']-s[key+'0'])*(at-s.t0)/(s.t1-s.t0),dx=value(x,lo,'x')-value(y,lo,'x'),dz=value(x,lo,'z')-value(y,lo,'z'),vx=(x.x1-x.x0)/(x.t1-x.t0)-(y.x1-y.x0)/(y.t1-y.t0),vz=(x.z1-x.z0)/(x.t1-x.t0)-(y.z1-y.z0)/(y.t1-y.t0),speed=vx*vx+vz*vz,dt=speed?Math.max(0,Math.min(hi-lo,-(dx*vx+dz*vz)/speed)):0;if(!Number.isFinite(limit)||![dx,dz,vx,vz,speed,dt].every(Number.isFinite)||Math.hypot(dx+vx*dt,dz+vz*dt)<=limit)return false;}if(x.t1<=y.t1)i++;if(y.t1<=x.t1)j++;}}
 return true;
}
