// Opt-in visual laboratory recipe. BiomeGround owns texture lifetime.
export const DESERT_SAND_NORMAL_PATH='/assets/visual-lab/aerial_beach_01-normal.png';
export function desertSandEnabled(search=globalThis.location?.search??''){
 const query=new URLSearchParams(search);
 return query.get('visualLab')==='global-lighting'&&query.get('sandRelief')==='1';
}
export function patchDesertSand(source){
 const edits=[
  ['tile=textureGrad(uGroundDetailMap,uv,du,dv).rgb;','if(!desert)tile=textureGrad(uGroundDetailMap,uv,du,dv).rgb;'],
  ['float needDetail=(desert||canyon)?grainFade:fineFade;','float needDetail=desert?(1.-smoothstep(.15,.65,pixelSpan)):canyon?grainFade:fineFade;'],
  ['rough=.98;normalAmount=.010*up;','rough=.98;normalAmount=.65*up*(1.-wear*.85);'],
  ['mix(.60,1.,uGroundDetail)*fineFade;','mix(.60,1.,uGroundDetail)*(desert?needDetail:fineFade);'],
  ['N=normalize(baseNormal-slope*normalAmount);',`N=normalize(baseNormal-slope*normalAmount);
     if(desert){vec3 T=normalize(vec3(.8,0.,.6)-Ng*dot(Ng,vec3(.8,0.,.6)));vec3 B=normalize(cross(Ng,T));vec3 mapN=tileN*2.-1.;N=normalize(T*mapN.x*normalAmount+B*mapN.y*normalAmount+Ng*max(mapN.z,.08));}`],
  ['float groundRough,groundWet;','float groundRough,groundWet;sandGeometricNormal=toonN;'],
  ['float edge=max(1.-smoothstep(.10,.36,nv),smoothstep(.26,.58,length(fwidth(N))*2.0));','float edge=max(1.-smoothstep(.10,.36,nv),smoothstep(.26,.58,length(fwidth(sandGeometricNormal))*2.0));'],
  ['float specBand=smoothstep(.62,.88,spec)*(1.-rough*.40);','float specBand=smoothstep(.62,.88,spec)*(1.-rough)*(1.-rough);']
 ];
 for(const [from,to]of edits){if(!source.includes(from))throw Error('Desert sand shader anchor missing: '+from);source=source.replace(from,to)}
 return 'vec3 sandGeometricNormal;\n'+source;
}
