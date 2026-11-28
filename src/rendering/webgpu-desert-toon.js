import {clamp,dot,floor,fract,fwidth,length,max,mix,pow,reflect,smoothstep,vec3} from 'three/tsl';

// Default desert branch of africanToon4: unlike the other biome-ground
// branches, it shades the authored albedo directly instead of groundLit.
export function desertToonColor({albedo,normal,view,sun,roughness,visibility,night,world,reflection}){
 const hash=p=>{let q=fract(p.mul(.1031));q=q.add(dot(q,q.yzx.add(33.33)));return fract(q.x.add(q.y).mul(q.z));};
 const noise=p=>{const i=floor(p),f=fract(p),u=f.mul(f).mul(vec3(3).sub(f.mul(2)));return mix(mix(mix(hash(i),hash(i.add(vec3(1,0,0))),u.x),mix(hash(i.add(vec3(0,1,0))),hash(i.add(vec3(1,1,0))),u.x),u.y),mix(mix(hash(i.add(vec3(0,0,1))),hash(i.add(vec3(1,0,1))),u.x),mix(hash(i.add(vec3(0,1,1))),hash(i.add(vec3(1,1,1))),u.x),u.y),u.z);};
 const ramp=(x,levels)=>floor(clamp(x,0,1).mul(levels-.0001)).div(levels-1),band=ramp(max(dot(normal,sun),0).mul(visibility),4),fill=ramp(clamp(normal.y.mul(.5).add(.5),0,1),3),spec=pow(max(dot(reflect(sun.negate(),normal),view),0),mix(18,34,roughness.oneMinus())),specBand=smoothstep(.62,.88,spec).mul(roughness.mul(.40).oneMinus()),warm=mix(vec3(1.42,1.06,.62),vec3(.28,.36,.58).mul(1.12),night),shade=mix(vec3(.46,.36,.22),vec3(.10,.14,.24).mul(1.12),night),base=mix(shade.mul(.46),warm,band.mul(.76).add(.24)),nv=max(dot(normal,view),0),rim=smoothstep(.18,.72,nv.oneMinus()).mul(roughness.oneMinus().mul(.12).add(.08)),brush=noise(world.mul(.85)).mul(.42).add(noise(world.mul(2.2)).mul(.22));
 let toon=albedo.mul(base).mul(fill.mul(.24).add(.76)).add(reflection.mul(roughness.oneMinus().mul(.05).add(.03))).add(vec3(specBand).mul(mix(vec3(.92,.78,.46),vec3(.70,.78,.96),night)).mul(.30)).add(albedo.mul(rim).mul(mix(vec3(.44,.24,.10),vec3(.10,.16,.26),night)));
 toon=toon.mul(mix(vec3(.98,.96,.92),vec3(1.03,.99,.92),brush.mul(.30))).max(0);
 let color=pow(clamp(toon.mul(toon.mul(2.51).add(.03)).div(toon.mul(toon.mul(2.43).add(.59)).add(.14)),0,1),1/2.2);
 color=mix(vec3(dot(color,vec3(.299,.587,.114))),color,1.12);color=mix(color,vec3(.84,.76,.58),brush.mul(.025));
 const edge=max(smoothstep(.10,.36,nv).oneMinus(),smoothstep(.26,.58,length(fwidth(normal)).mul(2))),ink=max(edge,smoothstep(.30,.62,length(fwidth(albedo)).mul(4)).mul(.35));
 return mix(color,mix(vec3(.28,.18,.07),vec3(.08,.09,.13),night),clamp(ink.mul(.38),0,.55));
}
