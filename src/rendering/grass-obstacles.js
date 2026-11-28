// Build the same local exclusion buckets from confirmed obstacle and crop data.
export function indexGrassObstacles(obstacles,plants,edgePadding){const buckets=new Map();const add=(o,minX,minZ,maxX,maxZ)=>{for(let x=Math.floor((minX-edgePadding-.1)/8);x<=Math.floor((maxX+edgePadding+.1)/8);x++)for(let z=Math.floor((minZ-edgePadding-.1)/8);z<=Math.floor((maxZ+edgePadding+.1)/8);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o)}};
 // Read existing obstacle footprints once per invalidation; never invoke navigation/engine queries.
 for(const o of obstacles??[]){if(o.kind==='shield')continue;const p=o.footprint;if(p?.length)add({polygon:p.map(v=>({x:v.x,z:v.z}))},Math.min(...p.map(v=>v.x)),Math.min(...p.map(v=>v.z)),Math.max(...p.map(v=>v.x)),Math.max(...p.map(v=>v.z)));else if(Number.isFinite(o.x)&&Number.isFinite(o.z)){const r=o.radius??.5;add({x:o.x,z:o.z,r},o.x-r,o.z-r,o.x+r,o.z+r)}}
 for(const p of plants.filter(p=>p.alive!==false))add({x:p.x,z:p.z,r:1.6},p.x-1.6,p.z-1.6,p.x+1.6,p.z+1.6);
 return buckets;}
