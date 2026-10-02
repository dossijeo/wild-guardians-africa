// Generated from Guardian V8 by tools/prepare_hands.py.
export const HAND_ASSETS = {"press": "/assets/50d4d0360f13f79647a7bdee41955d4d785df39fddb9ee7638a888567d360766.webp", "tap": "/assets/bb29d190b78bb429a12bb29c204969ed56067406d29f952d963c904ea039331c.webp", "pinch": "/assets/b965d4ec542922078ea805f6d7fc9b393ea9d40dcb9d52d715ffe3f33a726ce0.webp", "point": "/assets/4da8e967e0a888ba10695b12b4179e1cf8ac02ea241b98872de4c2ee31681538.webp", "drag": "/assets/fb6c2768a7e06cb1bdf4a99d067dfa703df0d56155d5d8872f16a3a6d6b611c8.webp", "open": "/assets/6b280de12c498d9492d0f9c4c55db20bd08e544107328972f29382ed68c34ac9.webp"};
export const HAND_INFO = {"tap": {"width": 327, "heightPx": 488, "pivot": [0.295, 0.878], "height": 1.8, "rotation": 0}, "press": {"width": 265, "heightPx": 513, "pivot": [0.723, 0.022], "height": 1.72, "rotation": 3.141592653589793}, "pinch": {"width": 384, "heightPx": 472, "pivot": [0.74, 0.4], "height": 1.8, "rotation": 0}, "point": {"width": 491, "heightPx": 248, "pivot": [0.982, 0.25], "height": 0.82, "rotation": 0}, "drag": {"width": 345, "heightPx": 495, "pivot": [0.65, 0.18], "height": 1.75, "rotation": 0}, "open": {"width": 379, "heightPx": 490, "pivot": [0.5, 0.98], "height": 1.8, "rotation": 0}};
export const HAND_STEPS = [{"kind": "open", "target": "plaza"}, {"kind": "tap", "target": "parcela-a"}, {"kind": "press", "target": "parcela-b"}, {"kind": "drag", "target": "plaza"}, {"kind": "point", "target": "entrada"}, {"kind": "pinch", "target": "granero"}, {"kind": "open", "target": "carro"}, {"kind": null, "target": null}];
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const smoothstep = (a,b,x) => {const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const V3={
 add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
 sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
 mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm(a){return this.mul(a,1/(Math.hypot(...a)||1));}
};
const rgb8=hex=>{const n=parseInt(hex.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
class WorldGeometry {
 constructor(){this.data=[];}
 vertex(p,n,c){this.data.push(...p,...n,...c);}
 tri(a,b,c,color){const n=V3.norm(V3.cross(V3.sub(b,a),V3.sub(c,a)));this.vertex(a,n,color);this.vertex(b,n,color);this.vertex(c,n,color);}
 quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
 box(p,s,c){const [x,y,z]=p,[w,h,d]=s.map(v=>v/2);const a=[[x-w,y-h,z-d],[x+w,y-h,z-d],[x+w,y+h,z-d],[x-w,y+h,z-d],[x-w,y-h,z+d],[x+w,y-h,z+d],[x+w,y+h,z+d],[x-w,y+h,z+d]];
  for(const f of [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]])this.quad(...f.map(i=>a[i]),c);
 }
 cylinder(p,r,h,c,n=24){const [x,y,z]=p;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
  const p0=[x+Math.cos(a)*r,y-h/2,z+Math.sin(a)*r],p1=[x+Math.cos(a)*r,y+h/2,z+Math.sin(a)*r],p2=[x+Math.cos(b)*r,y+h/2,z+Math.sin(b)*r],p3=[x+Math.cos(b)*r,y-h/2,z+Math.sin(b)*r];
  this.quad(p0,p1,p2,p3,c);this.tri([x,y+h/2,z],p2,p1,c);
 }}
 cone(p,r,h,c,n=32){const [x,y,z]=p;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,k=.96+.04*Math.sin(i*3.7);this.tri([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x,y+h,z],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],c.map(v=>v*k));}}
 ellipsoid(p,r,c,n=18,m=10){const at=(i,j)=>{const a=i/m*Math.PI-Math.PI/2,b=j/n*Math.PI*2,q=[Math.cos(a)*Math.cos(b),Math.sin(a),Math.cos(a)*Math.sin(b)];return {p:p.map((v,k)=>v+q[k]*r[k]),n:V3.norm(q.map((v,k)=>v/r[k]))};};
  for(let i=0;i<m;i++)for(let j=0;j<n;j++){const a=at(i,j),b=at(i+1,j),d=at(i,j+1),e=at(i+1,j+1);for(const t of [a,b,e,a,e,d])this.vertex(t.p,t.n,c);}
 }
 ring(p,r,width,c,segments=48){for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;const at=(rad,ang)=>[p[0]+Math.cos(ang)*rad,p[1],p[2]+Math.sin(ang)*rad];this.quad(at(r,a),at(r,b),at(r-width,b),at(r-width,a),c);}}
 line(a,b,c){this.vertex(a,[0,1,0],c);this.vertex(b,[0,1,0],c);}
 array(){return new Float32Array(this.data);}
}
export function clipQuadXZ(points,box,padding=0){
 let poly=points.map(p=>p.slice());
 for(const [axis,bound,sign] of [[0,box.min[0]-padding,1],[0,box.max[0]+padding,-1],[2,box.min[2]-padding,1],[2,box.max[2]+padding,-1]]){
  const input=poly;poly=[];if(!input.length)break;
  for(let i=0;i<input.length;i++){
   const a=input[i],b=input[(i+1)%input.length],da=(a[axis]-bound)*sign,db=(b[axis]-bound)*sign;
   if(da>=0)poly.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db);poly.push(a.map((v,k)=>v+(b[k]-v)*t));}
  }
 }
 return poly;
}
export class HandHints3D {
 constructor(scene,images){this.scene=scene;this.images=images;this.kind=null;this.stepIndex=-1;this.started=0;this.extraY=0;this.size=1;this.opacity=0;this.wire=false;this.last=null;this.routeFloor=0;this.custom=null;}
 setStep(i,t){this.stepIndex=i;this.started=t;this.extraY=0;this.last=null;this.custom=null;this.kind=HAND_STEPS[i]?.kind||null;this.routeFloor=this.kind==='drag'?this.routeClearance():0;}
 route(u){return this.scene.handRoute?.(u)||[-2.1+u*4.25,0,1.8-u*4.1];}
 routeClearance(){
  // Reserva TODO el corredor antes de animar. Nunca se interpola una altura
  // baja hacia una alta atravesando la fachada al llegar al siguiente edificio.
  let highest=this.scene.routeTerrainCeiling?.()??.03;const radius=1.95*this.size;
  for(let i=0;i<=48;i++){const p=this.route(i/48);for(const b of this.scene.colliders){if(p[0]>=b.min[0]-radius&&p[0]<=b.max[0]+radius&&p[2]>=b.min[2]-radius&&p[2]<=b.max[2]+radius)highest=Math.max(highest,b.max[1]);}}
  return highest+.10;
 }
 configuration(){return this.custom||(HAND_STEPS[this.stepIndex]||null);}
 makePose(t,cam){
  const cfg=this.configuration();if(!cfg?.kind)return null;
  const type=cfg.kind,asset=HAND_INFO[type],obj=this.scene.objects.get(cfg.target);
  if(!asset||(!obj&&!cfg.position))return null;
  let target=cfg.position?cfg.position.slice():V3.add(obj.position,cfg.local||obj.anchor);
  const a=this.scene.handMotion?t-this.started:0;
  let root=target.slice(),r=asset.rotation||0,height=asset.height*this.size,bob=0;
  if(type==='drag'){
   const s=.5-.5*Math.cos(a*.72),p=this.route(s);target=[p[0],this.scene.surfaceAt(p[0],p[2])+.025,p[2]];
   root=[p[0],this.routeFloor+height*.82+Math.sin(a*1.7)*.035,p[2]];r=.028*Math.sin(a*1.2);
  }else if(type==='tap'){
   const p=(a%2.25)/2.25,press=smoothstep(.22,.40,p)*(1-smoothstep(.52,.79,p));bob=.18-.12*press;root[1]+=bob;r=.025*Math.sin(a*1.5);
  }else if(type==='press'){
   const p=(a%3.8)/3.8,down=smoothstep(.10,.24,p)*(1-smoothstep(.73,.91,p));root[1]+=.19-.10*down;r=Math.PI+.015*Math.sin(a*.8);
  }else if(type==='point'){root[1]+=.24+.035*Math.sin(a*1.5);r=.025*Math.sin(a*1.4);}
  else if(type==='pinch'){root[1]+=.28;bob=.04*Math.sin(a*1.5);root[1]+=bob;r=.035*Math.sin(a*1.3);height*=1+.045*Math.sin(a*1.9);}
  else{root[1]+=.25+.055*Math.sin(a*1.6);r=.035*Math.sin(a*1.1);}
  const width=height*asset.width/asset.heightPx,cr=Math.cos(r),sr=Math.sin(r),right=V3.add(V3.mul(cam.right,cr),V3.mul(cam.up,sr)),up=V3.add(V3.mul(cam.up,cr),V3.mul(cam.right,-sr));
  // Pivot UV = punto del gesto (dedo, contacto, hueco del pellizco o muñeca).
  // No se centra la textura en el suelo: esa era la causa del enterramiento.
  const [pu,pv]=asset.pivot,uv=[[0,0],[1,0],[1,1],[0,1]];
  const corners=uv.map(([u,v])=>V3.add(root,V3.add(V3.mul(right,(u-pu)*width),V3.mul(up,(pv-v)*height))));
  return {type,target,root,corners,uv,height,width,objectId:cfg.target||'coordenada',age:a};
 }
 protect(pose,dt=0){
  const floor=this.scene.terrainClearance? -Infinity : (pose.type==='drag'?Math.max(.035,this.routeFloor):.035);
  let required=Math.max(0,floor-Math.min(...pose.corners.map(p=>p[1])),this.scene.terrainClearance?.(pose.corners)??0);
  for(const b of this.scene.colliders){const hit=clipQuadXZ(pose.corners,b,.09);if(hit.length)required=Math.max(required,b.max[1]+.085-Math.min(...hit.map(p=>p[1])));}
  // Subida inmediata a posición segura; descenso amortiguado y SIEMPRE por
  // encima del mínimo geométrico. No esconder el fallo desactivando profundidad.
  this.extraY=Math.max(required,this.extraY*Math.exp(-Math.max(0,dt)*6));
  pose.corners=pose.corners.map(p=>[p[0],p[1]+this.extraY,p[2]]);pose.root[1]+=this.extraY;pose.lift=this.extraY;
  return pose;
 }
 intersections(pose){
  if(!pose)return [];
  const bad=[];if(this.scene.terrainClearance?this.scene.terrainClearance(pose.corners)>.03501:Math.min(...pose.corners.map(p=>p[1]))<-.00001)bad.push('suelo');
  for(const b of this.scene.colliders){const hit=clipQuadXZ(pose.corners,b,0);if(hit.length&&Math.min(...hit.map(p=>p[1]))<b.max[1]-.00001&&Math.max(...hit.map(p=>p[1]))>b.min[1]+.00001)bad.push(b.id);}
  return bad;
 }
 update(t,dt,cam){
  const active=!['loading','closed','outro','farewell'].includes(this.scene.phase??'reading'),alphaTarget=active&&this.configuration()?.kind?1:0;
  this.opacity+=(alphaTarget-this.opacity)*(1-Math.exp(-dt*9));
  if(this.opacity<.002){this.last=null;return null;}
  const p=this.makePose(t,cam);this.last=p?this.protect(p,dt):null;return this.last;
 }
 getState(){const p=this.last;return {kind:p?.type||this.kind,target:p?.objectId||null,vertices:p?4:0,triangles:p?2:0,depthTest:true,depthWrite:false,alpha:this.opacity,minimumY:p?Math.min(...p.corners.map(x=>x[1])):null,targetPosition:p?.target||null,contactPosition:p?.root||null,extraLift:p?.lift||0,intersections:this.intersections(p),corners:p?.corners||null};}
}
export function handEffects(p,hands){
  const a=hands.opacity,g=new WorldGeometry(),l=new WorldGeometry(),gold=rgb8('#ffd77c'),ivory=rgb8('#fff0b9');
  const target=p.target.slice();target[1]+=.018;
  const pulse=.5+.5*Math.sin(p.age*2.4),r=p.type==='pinch'?.70:p.type==='point'?.35:.36;
  g.ring(target,r+.045*pulse,.022,gold);g.ring(target,r*.66,.014,ivory);
  // Conexión en geometría 3D: las caras del edificio la ocluyen correctamente.
  const distance=Math.hypot(...V3.sub(p.root,target));
  if(distance>.19){for(let i=0;i<12;i++){const f=i/12,f2=Math.min(1,f+.042);l.line(target.map((v,k)=>v+(p.root[k]-v)*f),target.map((v,k)=>v+(p.root[k]-v)*f2),ivory);}}
  if(p.type==='drag'){
   const route=new WorldGeometry();for(let i=0;i<32;i++){const a=hands.route(i/32),b=hands.route((i+.45)/32);a[1]=b[1]=hands.routeFloor+.025;route.line(a,b,gold);}l.data.push(...route.data);
  }
  if(hands.wire){for(const [i,j] of [[0,1],[1,2],[2,3],[3,0],[0,2]])l.line(p.corners[i],p.corners[j],rgb8('#73e0ce'));}
return {triangles:g.array(),lines:l.array(),ringAlpha:a*.90,lineAlpha:a*.70};
}
