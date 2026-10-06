import * as THREE from 'three';
import {hashCell} from '../world/terrain.js';
import {renderedTerrainSurface} from './terrain-surface.js';

// Static surface decoration: no collider, terrain regeneration or shadow caster.
// Clip each mud outline triangle against the actual one-metre ground triangles,
// so every resulting triangle lies on precisely the same terrain plane.
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
export function clipMudTriangle(subject,clip){
  let polygon=subject;
  for(let k=0;k<3&&polygon.length;k++){
    const a=clip[k],b=clip[(k+1)%3],next=[];
    for(let i=0;i<polygon.length;i++){
      const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=cross(a,b,p),dq=cross(a,b,q);
      if(dp>=-1e-9)next.push(p);
      if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);next.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
    }
    polygon=next;
  }
  return polygon;
}
export function mudPatchGeometry(field,cx,cz,scale=.115){
  if(field.c.biome!=='mangrove')return null;
  const origin=[cx*48,cz*48],positions=[],uvs=[],centers=[],outlines=[],heights=new Map();let patches=0;
  const sampled={surface:(x,z)=>{const key=x+","+z;if(!heights.has(key))heights.set(key,field.surface(x,z));return heights.get(key);}};
  const random=(i,salt)=>hashCell(field.seed,cx*13+i,cz*17-i,salt)/4294967296;
  for(let i=0;i<10;i++){
    const x=origin[0]-19+random(i,84311)*38,z=origin[1]-19+random(i,84317)*38;
    const rx=1.4+random(i,84319)*2.3,rz=rx*(.65+random(i,84323)*.6),phase=random(i,84329)*Math.PI*2;
    if(centers.some(p=>Math.hypot(x-p.x,z-p.z)<Math.max(rx,rz)+p.radius+.2))continue;
    const site=field.c.settlementSite;
    if(site&&Math.hypot(x-site.x,z-site.z)<site.clearRadius+Math.max(rx,rz)+2)continue;
    if(field.slope(x,z)>.23||field.waterInfo(x,z).inside)continue;
    const contour=Array.from({length:12},(_,j)=>{const a=j*Math.PI/6,r=1+.13*Math.sin(a*3+phase)+.08*Math.cos(a*5-phase);return new THREE.Vector2(x+Math.cos(a)*rx*r,z+Math.sin(a)*rz*r);});
    if(contour.some(p=>Math.abs(p.x-origin[0])>=24||Math.abs(p.y-origin[1])>=24||field.waterInfo(p.x,p.y).inside))continue;
    const triangles=THREE.ShapeUtils.triangulateShape(contour,[]),offset=[random(i,84331),random(i,84337)];
    for(const ids of triangles){
      const subject=ids.map(j=>[contour[j].x,contour[j].y]),minX=Math.floor(Math.min(...subject.map(p=>p[0]))),maxX=Math.ceil(Math.max(...subject.map(p=>p[0]))),minZ=Math.floor(Math.min(...subject.map(p=>p[1]))),maxZ=Math.ceil(Math.max(...subject.map(p=>p[1])));
      for(let gz=minZ;gz<maxZ;gz++)for(let gx=minX;gx<maxX;gx++)for(const ground of [[[gx,gz],[gx+1,gz],[gx,gz+1]],[[gx+1,gz+1],[gx,gz+1],[gx+1,gz]]]){
        const polygon=clipMudTriangle(subject,ground);
        for(let j=1;j+1<polygon.length;j++){
          const a=polygon[0],b=polygon[j],c=polygon[j+1];if(Math.abs(cross(a,b,c))<1e-9)continue;
          const vertices=cross(a,b,c)>0?[a,c,b]:[a,b,c];
          for(const p of vertices){positions.push(p[0]-origin[0],renderedTerrainSurface(sampled,...p)+.024,p[1]-origin[1]);uvs.push((p[0]-x)*scale+offset[0],(p[1]-z)*scale+offset[1]);}
        }
      }
    }
    centers.push({x,z,radius:Math.max(rx,rz)*1.21});outlines.push(contour.map(p=>[p.x,p.y]));patches++;
  }
  if(!positions.length)return null;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.mudPatches=patches;geometry.userData.mudCenters=centers;geometry.userData.mudOutlines=outlines;return geometry;
}
// Query only on an authored foot contact, using the exact already-rendered
// outlines. No raycasting, regeneration or per-frame scene traversal.
export function mudContainsPoint(surface,x,z){
  for(let k=0;k<(surface?.mudCenters?.length??0);k++){
    const center=surface.mudCenters[k],dx=x-center.x,dz=z-center.z;if(dx*dx+dz*dz>center.radius*center.radius)continue;
    const contour=surface.mudOutlines[k];let inside=false;
    for(let i=0,j=contour.length-1;i<contour.length;j=i++){
      const a=contour[j],b=contour[i],ex=b[0]-a[0],ez=b[1]-a[1],px=x-a[0],pz=z-a[1],dot=px*ex+pz*ez;
      if(Math.abs(ex*pz-ez*px)<=1e-9&&dot>=0&&dot<=ex*ex+ez*ez)return true;
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    if(inside)return true;
  }
  return false;
}
export function residentMudSurface(chunks,x,z){
  const group=chunks.get(Math.floor((x+24)/48)+','+Math.floor((z+24)/48));
  return mudContainsPoint(group?.userData.mudSurface,x,z)?'mud':null;
}
export class MudPatches {
  constructor(){this.textures=[];this.disposed=false;}
  assertOpen(){if(this.disposed)throw new Error('Mud load cancelled');}
  async load(assets,tile){
    this.assertOpen();this.scale=tile.scale??.115;
    try{
    for(const role of ['base','normal','arh']){
      const source=await assets.texture(tile[role],role==='base');this.assertOpen();const texture=source.clone();texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=8;texture.needsUpdate=true;this.textures.push(texture);
    }
    }catch(error){this.dispose();throw error;}
  }
  chunk(field,cx,cz){
    this.assertOpen();
    const geometry=mudPatchGeometry(field,cx,cz,this.scale);if(!geometry)return null;
    const [map,normalMap,packed]=this.textures;
    const material=new THREE.MeshStandardMaterial({map,normalMap,roughnessMap:packed,aoMap:packed,color:new THREE.Color().setRGB(.58,.61,.64),roughness:.52,metalness:0,side:THREE.FrontSide});
    material.userData.artSurface=0;
    const mesh=new THREE.Mesh(geometry,material);mesh.name='mangrove-mud-patches';mesh.userData.mudPatches=geometry.userData.mudPatches;mesh.castShadow=false;mesh.receiveShadow=true;return mesh;
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const texture of this.textures??[])texture.dispose();this.textures=[];}
}
