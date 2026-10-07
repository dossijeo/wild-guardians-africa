const frames=new WeakMap();

// Cache only rigid wall geometry. Validate all inputs on access, including for
// proposed placements and walls edited without rebuilding a navigator.
export function wallCollisionFrame(wall){
  const yaw=wall.yaw??0,base=wall.baseScaleX??1,gate=wall.gate,material=wall.material;
  let frame=frames.get(wall);
  if(frame&&frame.x===wall.x&&frame.z===wall.z&&frame.yaw===yaw&&frame.base===base&&frame.gate===gate&&frame.material===material)return frame;
  const scale=gate?(material==='reforzado'?1.6:['adobe','piedra'].includes(material)?1.4:1):1;
  frame={x:wall.x,z:wall.z,yaw,base,gate,material,c:Math.cos(yaw),s:Math.sin(yaw),width:1.09*base*scale,depth:.22*scale,polygons:new Map()};
  frames.set(wall,frame);return frame;
}

export function wallCollisionPolygon(wall,radius){
  const frame=wallCollisionFrame(wall);
  if(frame.polygons.has(radius))return frame.polygons.get(radius);
  const width=frame.width+radius,depth=frame.depth+radius;
  const polygon=[[-width,-depth],[width,-depth],[width,depth],[-width,depth]].map(([x,z])=>({x:frame.x+x*frame.c+z*frame.s,z:frame.z-x*frame.s+z*frame.c}));
  // Normal gameplay has a small set of actor radii; cap arbitrary query radii.
  if(frame.polygons.size>=8)frame.polygons.clear();
  frame.polygons.set(radius,polygon);return polygon;
}
