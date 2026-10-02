// WorldScene draws 48 subdivisions per 48 m chunk, with the a/b/a+1 diagonal.
// Sample those actual triangles for visual contacts, including negative chunks.
export function renderedTerrainSurface(field,x,z){
  const step=1,x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step,u=(x-x0)/step,v=(z-z0)/step;
  const a=field.surface(x0,z0),b=field.surface(x0+step,z0),d=field.surface(x0,z0+step),c=field.surface(x0+step,z0+step);
  return u+v<=1?a+(b-a)*u+(d-a)*v:c+(d-c)*(1-u)+(b-c)*(1-v);
}
