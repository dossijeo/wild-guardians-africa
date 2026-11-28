// QA-only transformation: retain the exact bilinear interpolation order but
// query only the channels consumed by the grass footprint probes.
export function grassMaskProbeCandidate(source){
 const anchor="// Identical candidate selection for both renderer owners; water and blocker";
 const before="const probe=sampleGrassTerrain(c,x+dx*(edgePadding/.6),z+dz*(edgePadding/.6)).ctx;edgeWear=Math.max(edgeWear,probe[3]);if(fern)fernEdgeCover=Math.min(fernEdgeCover,probe[0]);";
 const after="const probe=sampleFootprintMask(c,x+dx*(edgePadding/.6),z+dz*(edgePadding/.6),fern);edgeWear=Math.max(edgeWear,probe.wear);if(fern)fernEdgeCover=Math.min(fernEdgeCover,probe.cover);";
 const helper=`function sampleFootprintMask(c,x,z,fern){
 const lx=clamp(x-(c.cx*48-24),0,47.99999),lz=clamp(z-(c.cz*48-24),0,47.99999);
 const mx=clamp(lx/1.5+1,0,33.9999),mz=clamp(lz/1.5+1,0,33.9999),gx=Math.floor(mx),gz=Math.floor(mz),tx=mx-gx,tz=mz-gz;
 const sample=k=>{const at=(xx,zz)=>c.mask.data[(zz*35+xx)*4+k]/255;return (at(gx,gz)*(1-tx)+at(gx+1,gz)*tx)*(1-tz)+(at(gx,gz+1)*(1-tx)+at(gx+1,gz+1)*tx)*tz;};
 return {wear:sample(3),cover:fern?sample(0):undefined};
}
`;
 if(source.split(anchor).length!==2||source.split(before).length!==2)throw Error('Grass probe source changed');
 return source.replace(anchor,helper+anchor).replace(before,after);
}
