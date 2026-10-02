import {nativeWallLayout,simplify,smoothPath,resample,WALL_UNIT} from './wall-layout-native.js';
export {WALL_UNIT};
export const gateScale=material=>({adobe:1.4,piedra:1.4,reforzado:1.6}[material]??1);
export function wallLayout(structures,hp){
  const pieces=structures.filter(s=>s.kind==='wall').map(s=>({id:s.created,entityId:s.id,material:s.material,kind:s.gate?'gate':'wall',autoGate:!!s.autoGate,x:s.x,z:s.z,angle:-(s.yaw??0),baseScaleX:s.baseScaleX??1,scaleX:(s.baseScaleX??1)*(s.gate?gateScale(s.material):1),hp:s.hp,maxHp:s.maxHp,collapse:s.status==='collapsing',visual:s.hp/s.maxHp}));
  return {...nativeWallLayout,pieces,settings:{hp}};
}
export function wallStroke(input,structures,{smooth=true,snap=true}={}){
  if(!Array.isArray(input)||input.some(q=>!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite)))throw new Error('Trazado de muralla inválido');
  let points=input.map(q=>q.slice());if(points.length<2)return [];
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
  const closed=points.length>=3&&length>WALL_UNIT*2.2&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<1.1;
  if(closed)points[points.length-1]=points[0].slice();points=simplify(points,.13);if(smooth)points=smoothPath(points);
  const layout=wallLayout(structures,{});
  if(snap){points[0]=layout.snap(points[0]);points[points.length-1]=closed?points[0].slice():layout.snap(points.at(-1));}
  if(closed)points[points.length-1]=points[0].slice();
  return resample(points).filter(slot=>!layout.pieces.some(p=>Math.hypot(p.x-slot.x,p.z-slot.z)<.35&&Math.abs(Math.sin(p.angle-slot.angle))<.18));
}
