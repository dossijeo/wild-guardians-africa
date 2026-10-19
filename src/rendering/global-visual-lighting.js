// Opt-in global visual lab. Reuses existing shadow visibility; no texture lookup.
export function patchGlobalGroundFill(source){
 const legacy='vec3 ambient=mix(groundFill,skyFill,clamp(N.y*.5+.5,0.,1.));';
 const mapped='vec3 biomeAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);';
 if(!source.includes(legacy))throw Error('Global ground fill: legacy shader anchor missing');
 if(source.includes('vec3 biomeSun=')&&!source.includes(mapped))throw Error('Global ground fill: mapped shader anchor missing');
 const enabled='((uBiome<2.5||uBiome>3.5&&uBiome<4.5)?1.:0.)';
 const weight=visibility=>`smoothstep(0.,1.,clamp((1.-${visibility})/.93,0.,1.))*(1.-uNight)*${enabled}`;
 return 'uniform vec3 uGlobalGroundShade;\n'+source
  .replace(legacy,legacy+`\n ambient=mix(ambient,uGlobalGroundShade,${weight('visibility')});`)
  .replace(mapped,mapped+`\n biomeAmbient=mix(biomeAmbient,uGlobalGroundShade,${weight('groundVisibility')});`);
}
