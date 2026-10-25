// QA-only volcanic ash deposits. Two existing ALU noise calls, no new sampler.
export function patchVolcanicAsh(source){
 const anchors=['float reliefMask=canyon?canyonFlat:up;','color=clamp(mix(original,tex,amount),0.,1.);','uGroundParams.z*uGroundMicro*amount*normalFade','rough=baseRough;','materialAO410=mix(1.,mix(.45,1.,arh.r),amount);'];
 if(!anchors.every(a=>source.includes(a)))throw Error('Volcanic ash shader anchor missing');
 return source.replace(anchors[0],`${anchors[0]}
 float qaAsh=0.;
 if(rock){vec3 p=worldPatternPosition(worldP);float broad=materialNoise(vec3(p.x*.075,7.1,p.z*.075));float edge=materialNoise(vec3(p.x*.24,13.7,p.z*.24));qaAsh=smoothstep(.39,.66,broad*.78+edge*.22)*smoothstep(.78,.97,Ng.y);reliefMask*=1.-qaAsh*.85;}
 `).replace(anchors[1],`if(rock){float fine=dot(tex,vec3(.2126,.7152,.0722));vec3 ash=vec3(.30,.285,.265)*(.86+fine*.38);tex=mix(tex,ash,qaAsh*.78);}
 ${anchors[1]}`).replace(anchors[2],anchors[2]+'*(1.-qaAsh*.82)').replace(anchors[3],'rough=mix(baseRough,.96,qaAsh*.8);').replace(anchors[4],anchors[4]+'materialAO410=mix(materialAO410,1.,qaAsh*.65);');
}
