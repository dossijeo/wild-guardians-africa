// Reviewed lab option: preserve nighttime response and direct solar highlights.
export function canyonWaterReflectionEnabled(biome,search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);
 return biome==='gran-canon'&&q.get('visualLab')==='global-lighting'&&q.get('canyonWater')==='calm';
}
export function patchCanyonWaterReflection(source){
 const a='float f=.022+.978*pow(1.-max(dot(wn,V),0.),5.);',b='environment4(reflect(-V,wn),.10)';
 if(!source.includes(a)||!source.includes(b))throw Error('Canyon reflection shader anchors missing');
 return source.replace(a,'vec3 reflectionN=wn;if(uNight<1.)reflectionN=normalize(vec3(wn.xz*mix(.25+.75*smoothstep(.12,.65,V.y),1.,uNight),wn.y).xzy);float f=.022+.978*pow(1.-max(dot(reflectionN,V),0.),5.);').replace(b,'environment4(reflect(-V,reflectionN),.10)');
}
