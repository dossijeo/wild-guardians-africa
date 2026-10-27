// Rendering-only: preserve source bytes and never decrease occupation wear.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const hash=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^712;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v}
export function riverFringeMask(source,bo){
 const result=source.slice();let changed=0;
 for(let z=0;z<35;z++)for(let x=0;x<35;x++){
  const at=(z*35+x)*4,w=source[at+3]/255;
  const edge=smooth(.04,.16,w)*(1-smooth(.38,.60,w));
  const patch=smooth(.40,.72,noise((bo.minX+(x-1)*1.5)/4,(bo.minZ+(z-1)*1.5)/4));
  result[at+3]=Math.round(Math.min(1,w+.20*edge*patch)*255);
  if(result[at+3]!==source[at+3])changed++;
 }
 const a=globalThis.qaRiverFringeAudit??={masks:0,changed:0};a.masks++;a.changed+=changed;
 return result;
}
