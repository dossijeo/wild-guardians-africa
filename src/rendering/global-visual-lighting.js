// Opt-in global visual lab. Reuses existing shadow visibility; no texture lookup.
export function patchGlobalGroundFill(source,shade){
 const legacy='vec3 ambient=mix(groundFill,skyFill,clamp(N.y*.5+.5,0.,1.));';
 const mapped='vec3 biomeAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);';
 if(!source.includes(legacy))throw Error('Global ground fill: legacy shader anchor missing');
 if(source.includes('vec3 biomeSun=')&&!source.includes(mapped))throw Error('Global ground fill: mapped shader anchor missing');
 const color='vec3('+shade.map(v=>v.toFixed(6)).join(',')+')';
 const weight=visibility=>`smoothstep(0.,1.,clamp((1.-${visibility})/.93,0.,1.))*(1.-uNight)`;
 return source
  .replace(legacy,legacy+`\n ambient=mix(ambient,${color},${weight('visibility')});`)
  .replace(mapped,mapped+`\n biomeAmbient=mix(biomeAmbient,${color},${weight('groundVisibility')});`);
}

export function patchVolcanicCharcoal(source){
 const anchor='if(rock)tex=pow(max(tex,vec3(.001)),vec3(.91));';
 if(!source.includes(anchor))throw Error('Volcanic charcoal: albedo shader anchor missing');
 return source.replace(anchor,'if(rock){float charcoal=dot(tex,vec3(.2126,.7152,.0722));tex=mix(vec3(charcoal)*vec3(1.10,.99,.88),tex,.18);tex=pow(max(tex,vec3(.001)),vec3(.91));}');
}

// Dry mapped ground keeps its color and microgeometry; avoid a glossy turf response.
export function patchDryGroundRoughness(source){
 const anchor='rough=baseRough;';
 if(!source.includes(anchor))throw Error('Dry ground roughness: shader anchor missing');
 return source.replace(anchor,'if(!moss&&!rock)baseRough=max(baseRough,.86);rough=baseRough;');
}

const nightBiomes=new Set(['sabana','gran-rio','manglares','volcanes','gran-canon']);
export function globalNightLight(enabled,biome){return enabled&&nightBiomes.has(biome)?1.55:1.12;}
