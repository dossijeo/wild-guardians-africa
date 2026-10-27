// Final daylight grading uses existing lighting evaluations, not a post pass.
export const DAYLIGHT_BIOMES=new Set(['sabana','gran-rio','manglares','volcanes','savanna','grand_river','mangrove','volcanoes']);
export function finalDaylightEnabled(search=''){return new URLSearchParams(search).get('finalDaylight')!=='0';}
export function patchDaylightGround(source){
 return source.replace('mix(vec3(3.65,3.30,2.78),','mix(vec3(5.0,3.9,2.3),').replace('mix(vec3(.55,.63,.67),','mix(vec3(.33,.42,.49),');
}
export function patchDaylightGrass(source){
 return source.replace('vec3(1.55,1.42,1.02)','vec3(2.1,1.65,.80)').replace('vec3(.17,.28,.34)','vec3(.15,.25,.31)');
}
export function patchDaylightFern(source){
 return source.replace('vec3(2.46,2.28,1.54)','vec3(3.30,2.60,1.20)').replace('vec3(.17,.28,.34)','vec3(.15,.25,.31)');
}
export function patchDaylightFernLod(source){
 return source.replace('result=vec4(c.rgb,1.);','result=vec4(c.rgb*mix(vec3(1.12,1.02,.85),vec3(1.),uNight),1.);');
}
