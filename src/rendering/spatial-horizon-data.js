import {Geometry,desertSmoothNormals} from './terrain-source.js';

const mix=(a,b,t)=>a+(b-a)*t;
const rgb=s=>[parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255];

// QA-only horizon builder. It deliberately receives the same spatial core that
// owns the resident chunks; it never constructs a JavaScript TerrainField.
export function buildSpatialHorizonData(core,{config,profile,region}){
  if(!['canyons','desert'].includes(config.biome))throw RangeError('No spatial horizon for this biome');
  const canyon=config.biome==='canyons',R=canyon?384:576,dx=canyon?4:8,dz=8;
  const {cx,cz,bounds:near}=region,ox=cx*48,oz=cz*48;
  const cols=2*R/dx,rows=2*R/dz,terrain=new Geometry(),water=new Geometry();
  const points=[],coordinates=[],seen=new Set(),heights=new Map();
  const key=(x,z)=>`${x},${z}`;
  const register=(x,z)=>{
    if(!Number.isInteger(x)||!Number.isInteger(z))throw RangeError('Native horizon colors require integer coordinates');
    const k=key(x,z);if(!seen.has(k)){seen.add(k);coordinates.push(x,z);}
  };
  const height=(x,z)=>{
    const k=key(x,z);if(!heights.has(k))heights.set(k,core.surfaceAnywhere(x,z));
    return heights.get(k);
  };
  const point=(x,z)=>[x-ox,height(x,z),z-oz];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const x=ox-R+i*dx,z=oz-R+j*dz;
    points.push(point(x,z));register(x,z);
  }
  // The seam fan uses a 1 m ring. Register its colors before the single
  // JS→WASM batch rather than querying the native core for every triangle.
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=ox-R+i*dx,z=oz-R+j*dz;
    const touches=((x+dx===near[0]||x===near[2])&&z>=near[1]&&z+dz<=near[3])||
      ((z+dz===near[1]||z===near[3])&&x>=near[0]&&x+dx<=near[2]);
    if(!touches)continue;
    register(x+dx/2,z+dz/2);
    for(const [a,b,c,d] of [[x,z,x,z+dz],[x,z+dz,x+dx,z+dz],[x+dx,z+dz,x+dx,z],[x+dx,z,x,z]]){
      const edge=(a===c&&(a===near[0]||a===near[2])&&b>=near[1]&&d>=near[1]&&b<=near[3]&&d<=near[3])||
        (b===d&&(b===near[1]||b===near[3])&&a>=near[0]&&c>=near[0]&&a<=near[2]&&c<=near[2]);
      const steps=edge?Math.abs(a-c)+Math.abs(b-d):1;
      for(let t=0;t<steps;t++)register(mix(a,c,t/steps),mix(b,d,t/steps));
    }
  }
  if(!canyon){
    for(let z=near[1];z<=near[3];z++){register(near[0],z);register(near[2],z);}
    for(let x=near[0];x<=near[2];x++){register(x,near[1]);register(x,near[3]);}
  }
  const colorValues=core.groundColorsAnywhere(Float32Array.from(coordinates)),colors=new Map();
  for(let i=0;i<coordinates.length;i+=2)colors.set(key(coordinates[i],coordinates[i+1]),
    Array.from(colorValues.subarray(i/2*3,i/2*3+3)));
  const color=(x,z)=>colors.get(key(x,z));
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=ox-R+i*dx,z=oz-R+j*dz;
    if(x>=near[0]&&z>=near[1]&&x+dx<=near[2]&&z+dz<=near[3])continue;
    const a=j*(cols+1)+i,b=a+1,d=a+cols+1,c=d+1;
    const touches=((x+dx===near[0]||x===near[2])&&z>=near[1]&&z+dz<=near[3])||
      ((z+dz===near[1]||z===near[3])&&x>=near[0]&&x+dx<=near[2]);
    if(touches){
      const corners=[[x,z],[x,z+dz],[x+dx,z+dz],[x+dx,z]],ring=[];
      for(let k=0;k<4;k++){
        const p=corners[k],q=corners[(k+1)%4];
        const edge=(p[0]===q[0]&&(p[0]===near[0]||p[0]===near[2])&&p[1]>=near[1]&&q[1]>=near[1]&&p[1]<=near[3]&&q[1]<=near[3])||
          (p[1]===q[1]&&(p[1]===near[1]||p[1]===near[3])&&p[0]>=near[0]&&q[0]>=near[0]&&p[0]<=near[2]&&q[0]<=near[2]);
        const steps=edge?Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1]):1;
        for(let t=0;t<steps;t++)ring.push([mix(p[0],q[0],t/steps),mix(p[1],q[1],t/steps)]);
      }
      const center=point(x+dx/2,z+dz/2),middleColor=color(x+dx/2,z+dz/2);
      for(let k=0;k<ring.length;k++){
        const p=ring[k],q=ring[(k+1)%ring.length];
        terrain.tri(center,point(...p),point(...q),middleColor,[middleColor,color(...p),color(...q)]);
      }
    }else{
      terrain.tri(points[a],points[d],points[b],color(x,z),
        [color(x,z),color(x,z+dz),color(x+dx,z)]);
      terrain.tri(points[b],points[d],points[c],color(x+dx,z+dz),
        [color(x+dx,z),color(x,z+dz),color(x+dx,z+dz)]);
    }
  }
  if(canyon&&config.river){
    const waterColor=rgb(profile.colors.water),y=core.riverLevel();
    for(let z=oz-R;z<oz+R;z++){
      const left=core.riverEdge(z,-1)-1.2,right=core.riverEdge(z,1)+1.2;
      const nextLeft=core.riverEdge(z+1,-1)-1.2,nextRight=core.riverEdge(z+1,1)+1.2;
      const a=[left-ox,y,z-oz],b=[right-ox,y,z-oz],d=[nextLeft-ox,y,z+1-oz],c=[nextRight-ox,y,z+1-oz];
      water.tri(a,d,b,waterColor);water.tri(b,d,c,waterColor);
    }
  }
  if(!canyon){
    const apron=(axis,value,from,to)=>{
      const p=(t,offset)=>{
        const x=axis===0?value+offset:t,z=axis===0?t:value+offset;
        return [x-ox,height(x,z)-.012,z-oz];
      };
      for(let t=from;t<to;t++){
        const a=p(t,-.10),b=p(t,.10),c=p(t+1,.10),d=p(t+1,-.10);
        const col=color(axis===0?value:t,axis===0?t:value);
        terrain.tri(a,b,d,col);terrain.tri(b,c,d,col);
      }
    };
    apron(0,near[0],near[1],near[3]);apron(0,near[2],near[1],near[3]);
    apron(1,near[1],near[0],near[2]);apron(1,near[3],near[0],near[2]);
    desertSmoothNormals({height},terrain.v,ox,oz);
  }
  return {terrain:new Float32Array(terrain.v),water:new Float32Array(water.v)};
}
