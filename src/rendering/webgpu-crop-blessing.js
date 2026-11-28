import {attribute,cameraPosition,diffuseColor,dot,float,materialColor,materialEmissive,max,mix,normalize,normalWorld,positionWorld,pow,sin,smoothstep,step,vec3,vec4} from 'three/tsl';

// Crop instances share their existing material and receive only a compact
// confirmed blessing flag and reveal time. The shared clock drives the pulse.
export function configureWebGpuCropBlessing(material,clock){
 if(!material?.isNodeMaterial||!clock?.isNode)throw TypeError('Invalid crop blessing material');
 const info=attribute('iBlessing','vec4'),active=info.x.mul(step(info.y,clock)),base=vec4(material.colorNode??materialColor),leaf=smoothstep(.005,.06,base.g.sub(max(base.r.mul(1.08),base.b.mul(1.05)))),luminance=dot(base.rgb,vec3(.2126,.7152,.0722)),tinted=mix(base.rgb,vec3(.10,.62,.025).mul(luminance.mul(1.8).add(.45)),leaf.mul(.72).mul(active));
 material.colorNode=vec4(tinted,base.a);
 const organic=smoothstep(.005,.06,diffuseColor.g.sub(max(diffuseColor.r.mul(1.08),diffuseColor.b.mul(1.05)))),view=normalize(cameraPosition.sub(positionWorld)),rim=pow(float(1).sub(dot(normalize(normalWorld),view).abs()),4),pulse=pow(max(sin(clock.mul(.65)),0),12),burst=smoothstep(0,2.8,clock.sub(info.y).max(0)).oneMinus(),wound=smoothstep(0,.45,clock.sub(info.z).max(0)).oneMinus(),magic=vec3(.025,.16,.025).add(vec3(.01,.75,.48).mul(rim)).mul(organic).mul(pulse.mul(.12).add(burst.mul(.6)).add(.9)).add(vec3(.42,.10,.025).mul(wound)).mul(active);
 const selectionRim=float(1).sub(dot(normalize(normalWorld),view).abs()),selection=vec3(.12,.22,.07).mul(smoothstep(.35,.9,selectionRim)).mul(info.w.greaterThan(1.5).select(1.8,1)).mul(step(.5,info.w));
 material.emissiveNode=(material.emissiveNode??materialEmissive).add(magic).add(selection);
 return material;
}
