// QA only: estimate local patch scale from the nearest source contour bounds.
export async function installMangroveSizedInsetRoute(page){
 await page.route('**/tools/experiments/qa-mangrove-mud-moss-blend.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const replace=(a,b)=>{if(!body.includes(a))throw Error('Sized inset anchor missing: '+a);body=body.replace(a,b)};
  replace('edges=new Float32Array(p.count),','edges=new Float32Array(p.count),radii=new Float32Array(p.count),');
  replace('edges[i]=edges[previous];','edges[i]=edges[previous];radii[i]=radii[previous];');
  replace('let dist=Infinity;','let dist=Infinity,radius=0;');
  replace('dist=Math.min(dist,Math.hypot(wx-a[0]-t*dx,wz-a[1]-t*dz));','const candidate=Math.hypot(wx-a[0]-t*dx,wz-a[1]-t*dz);if(candidate<dist){dist=candidate;radius=.5*Math.min(c.maxX-c.minX,c.maxZ-c.minZ);}');
  replace('edges[i]=dist;','edges[i]=dist;radii[i]=radius;');
  replace("g.setAttribute('qaMudEdge',new THREE.BufferAttribute(edges,1));","g.setAttribute('qaMudEdge',new THREE.BufferAttribute(edges,1));g.setAttribute('qaMudRadius',new THREE.BufferAttribute(radii,1));attributeBytes+=radii.byteLength;");
  replace('attribute float qaMudEdge;','attribute float qaMudEdge;attribute float qaMudRadius;varying float vQAMudRadius;');
  replace('vQAMudEdge=qaMudEdge;','vQAMudEdge=qaMudEdge;vQAMudRadius=qaMudRadius;');
  replace('uniform sampler2D uQAMudBase,uQAMudNormal,uQAMudPacked;','uniform sampler2D uQAMudBase,uQAMudNormal,uQAMudPacked;varying float vQAMudRadius;');
  replace('float mudWeight=smoothstep(.05,.85,vQAMudEdge);',`vec3 fringeP=worldPatternPosition(vToonWorld);
    float fringe=materialNoise(vec3(fringeP.x*.9,5.3,fringeP.z*.9));
    float fringeRadius=max(vQAMudRadius,.1);
    float fringeCore=1.-smoothstep(.28,.58,vQAMudEdge/fringeRadius);
    float fringeInset=min(1.4,fringeRadius*.30)*fringeCore*smoothstep(.25,.75,fringe);
    float mudWeight=smoothstep(.05,min(.65,fringeRadius*.24+.08),vQAMudEdge-fringeInset);`);
  replace('|qa-mud-moss-blend-v1|','|qa-mud-moss-sized-inset-v1|');
  await route.fulfill({response,body});
 });
}
