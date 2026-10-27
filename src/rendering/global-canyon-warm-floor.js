// Authored indirect-light palette, not a physical bounce-light calculation.
export function canyonWarmFloorEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('canyonFloor')==='warm';
}
const old=[.22,.27,.36],warm=[.38,.255,.18],luminance=[.2126,.7152,.0722];
const lum=a=>a.reduce((sum,v,i)=>sum+v*luminance[i],0),scale=lum(old)/lum(warm);
export const canyonWarmFloorColor=Object.freeze(warm.map(v=>v*scale));
export function patchCanyonWarmFloor(source){
 const anchor='vec3 biomeDirect=brdf4(toonN,toonV,uLightDir,groundAlbedo,groundRough,0.)*biomeSun*groundVisibility;';
 if(!source.includes(anchor))throw Error('Canyon warm floor illumination anchor missing');
 return source.replace(anchor,`
 float qaWarmWeight=smoothstep(0.,1.,clamp((1.-groundVisibility)/.93,0.,1.))*(1.-uNight)*smoothstep(.74,.96,toonN.y);
 biomeAmbient=mix(biomeAmbient,vec3(${canyonWarmFloorColor.join(',')}),qaWarmWeight);
 `+anchor);
}
