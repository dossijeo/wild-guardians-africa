// Opt-in canyon wall color. Shared texture ownership belongs to BiomeGround.
export const CANYON_ROCK_PATH='/assets/visual-lab/cliff_side-Diffuse.jpg';
export function patchCanyonRock(source){
 const anchor='original=mix(original,stone,smoothstep(1.4,4.,h)*.90);';
 const bands='pale*.72+thin*.32';
 if(!source.includes(anchor)||!source.includes(bands))throw Error('Canyon rock shader anchor missing');
 return 'uniform sampler2D uCliffRock;\n'+source.replaceAll(bands,'pale*.24+thin*.10').replace(anchor,anchor+`
    float rockWall=(1.-canyonFlat)*smoothstep(1.4,4.,h);
    if(rockWall>.001){
     vec3 rockP=worldPatternPosition(worldP);
     bool xAxis=abs(Ng.x)>abs(Ng.z);
     vec2 rockUV=xAxis?vec2(rockP.z*sign(Ng.x),-rockP.y):vec2(rockP.x*sign(Ng.z),rockP.y);
     float rockLum=dot(texture(uCliffRock,rockUV*.125).rgb,vec3(.2126,.7152,.0722));
     vec3 rockColor=original*clamp(rockLum*2.8+.25,.32,1.35);
     original=mix(original,rockColor,rockWall*.85);
    }

 `);
}
