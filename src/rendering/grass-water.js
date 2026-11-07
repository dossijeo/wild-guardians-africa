const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function nearWaterChunk(c,x,z,padding){
 if(c.water.some(b=>x>b[0]-padding&&x<b[2]+padding&&z>b[1]-padding&&z<b[3]+padding))return true;
 for(const t of c.waterTriangles.get(Math.floor(x/8)+','+Math.floor(z/8))??[]){
 const a=(t[2]-t[0])*(z-t[1])-(t[3]-t[1])*(x-t[0]),b=(t[4]-t[2])*(z-t[3])-(t[5]-t[3])*(x-t[2]),d=(t[0]-t[4])*(z-t[5])-(t[1]-t[5])*(x-t[4]);
 if((a>=0&&b>=0&&d>=0)||(a<=0&&b<=0&&d<=0))return true;
 for(let i=0;i<3;i++){const j=(i+1)%3,ax=t[i*2],az=t[i*2+1],dx=t[j*2]-ax,dz=t[j*2+1]-az,u=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);if((x-ax-u*dx)**2+(z-az-u*dz)**2<padding*padding)return true;}
 }return false;}
 export function nearGrassWater(chunks,c,x,z,padding){
 const xs=[c.cx],zs=[c.cz];if(x<c.cx*48-24+padding)xs.push(c.cx-1);if(x>c.cx*48+24-padding)xs.push(c.cx+1);if(z<c.cz*48-24+padding)zs.push(c.cz-1);if(z>c.cz*48+24-padding)zs.push(c.cz+1);
 for(const cx of xs)for(const cz of zs){const neighbor=chunks.get(cx+','+cz);if(neighbor&&nearWaterChunk(neighbor,x,z,padding))return true;}return false;
 }

// Water coordinates are chunk-local, matching the Wild Engine payload.
export function indexConfirmedGrassWater(payload,padding){
 if(!(payload?.water instanceof Float32Array)||payload.water.length%9||!Number.isSafeInteger(payload.cx)||!Number.isSafeInteger(payload.cz)||!Number.isFinite(padding)||padding<0)throw TypeError('Invalid confirmed water');
 const waterTriangles=new Map();let waterTriangleCount=0;
 for(let i=0;i<payload.water.length;i+=9){const t=[];for(let j=0;j<3;j++)t.push(payload.water[i+j*3]+payload.cx*48,payload.water[i+j*3+2]+payload.cz*48);if(t.some(v=>!Number.isFinite(v)))throw TypeError('Invalid confirmed water vertex');const area=(t[2]-t[0])*(t[5]-t[1])-(t[3]-t[1])*(t[4]-t[0]);if(Math.abs(area)<1e-9)continue;waterTriangleCount++;const minX=Math.min(t[0],t[2],t[4])-padding,maxX=Math.max(t[0],t[2],t[4])+padding,minZ=Math.min(t[1],t[3],t[5])-padding,maxZ=Math.max(t[1],t[3],t[5])+padding;for(let x=Math.floor(minX/8);x<=Math.floor(maxX/8);x++)for(let z=Math.floor(minZ/8);z<=Math.floor(maxZ/8);z++){const key=x+','+z;if(!waterTriangles.has(key))waterTriangles.set(key,[]);waterTriangles.get(key).push(t);}}
 return {cx:payload.cx,cz:payload.cz,water:[],waterTriangles,waterTriangleCount};
}
