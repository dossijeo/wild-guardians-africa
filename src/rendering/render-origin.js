// Bioma Lab V4.0: recenter only beyond 144 units, on its 48-unit grid.
// Simulation/navigation coordinates remain global JavaScript numbers.
export class RenderOrigin {
  x = 0;
  z = 0;
  revision = 0;
  update(target) {
    if (Math.abs(target.x-this.x)<=144 && Math.abs(target.z-this.z)<=144) return false;
    this.x=Math.round(target.x/48)*48;
    this.z=Math.round(target.z/48)*48;
    this.revision++;
    return true;
  }
}

// Projection, view vectors and shadow sampling see the same local world during
// every pass. CPU simulation, streaming, picking and effect advancement run
// outside this synchronous window and retain their global coordinates.
export function withRenderOrigin({scene,camera,origin,detached=[],minMax=[],minSize=[]},draw){
  if(!origin.x&&!origin.z)return draw();
  const position=scene.position.clone(),eye=camera.position.clone();
  const roots=detached.map(root=>[root,root.position.clone()]);
  const bounds=new Map();
  for(const value of [...minMax,...minSize])if(!bounds.has(value))bounds.set(value,value.clone());
  try{
    scene.position.x-=origin.x;scene.position.z-=origin.z;
    camera.position.x-=origin.x;camera.position.z-=origin.z;
    for(const [root] of roots){root.position.x-=origin.x;root.position.z-=origin.z;root.updateMatrixWorld(true);}
    for(const value of new Set(minMax)){value.x-=origin.x;value.y-=origin.z;value.z-=origin.x;value.w-=origin.z;}
    for(const value of new Set(minSize)){value.x-=origin.x;value.y-=origin.z;}
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    return draw();
  }finally{
    scene.position.copy(position);camera.position.copy(eye);
    for(const [root,saved] of roots){root.position.copy(saved);root.updateMatrixWorld(true);}
    for(const [value,saved] of bounds)value.copy(saved);
    // Restore world matrices too: input/raycast and terrain effect callbacks
    // must never observe last frame's relative transform after this returns.
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  }
}

export function renderOriginBounds(scene,materials=null){
  const bounds=new Set();
  const remember=material=>{
    const data=material.userData;
    if(data.horizonBounds)bounds.add(data.horizonBounds);
    if(data.paintUniforms)bounds.add(data.paintUniforms.uFluidBounds.value);
  };
  // The live registry includes shared, hidden and newly attached mesh materials.
  // Read metadata each time: bounds/uniform objects can be replaced independently
  // of scene membership. General callers retain the complete traversal fallback.
  if(materials)for(const material of materials)remember(material);
  else scene.traverse(object=>{
    for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])remember(material);
  });
  return [...bounds];
}

export const worldPatternFunctions='uniform vec2 uWorldOrigin;\nvec3 worldPatternPosition(vec3 p){return p+vec3(uWorldOrigin.x,0.,uWorldOrigin.y);}\n';
