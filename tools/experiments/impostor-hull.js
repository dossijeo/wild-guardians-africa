import * as THREE from 'three';
export function convexHull(points){
 const sorted=points.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lower=[],upper=[];for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of [...sorted].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return lower.slice(0,-1).concat(upper.slice(0,-1));
}
export function impostorHullShape(hull){
 if(!Array.isArray(hull)||hull.length<3||hull.length>32||hull.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))throw Error('Invalid impostor hull');
 const canonical=convexHull(hull);if(canonical.length!==hull.length||canonical.some((p,i)=>p[0]!==hull[i][0]||p[1]!==hull[i][1]))throw Error('Impostor hull must be strictly convex and ordered');
 const shape=new THREE.BufferGeometry(),n=Math.max(4,hull.length),positions=new Float32Array(n*3),uv=new Float32Array(n*2),normals=new Float32Array(n*3),indices=new Uint16Array((n-2)*3);shape.setAttribute('position',new THREE.BufferAttribute(positions,3));shape.setAttribute('uv',new THREE.BufferAttribute(uv,2));shape.setAttribute('normal',new THREE.BufferAttribute(normals,3));shape.setIndex(new THREE.BufferAttribute(indices,1));
 const quad=[[0,0],[1,0],[1,1],[0,1]];let enabled=null;
 function set(value){value=!!value;if(enabled===value)return false;enabled=value;const points=value?hull:quad;for(let i=0;i<n;i++){const p=points[Math.min(i,points.length-1)];positions[i*3]=p[0]-.5;positions[i*3+1]=p[1]-.5;normals[i*3+2]=1;uv[i*2]=p[0];uv[i*2+1]=p[1];}for(let i=0;i<points.length-2;i++)indices.set([0,i+1,i+2],i*3);shape.setDrawRange(0,(points.length-2)*3);for(const attribute of Object.values(shape.attributes))attribute.needsUpdate=true;shape.index.needsUpdate=true;return true;}
 set(true);return {shape,set};
}
