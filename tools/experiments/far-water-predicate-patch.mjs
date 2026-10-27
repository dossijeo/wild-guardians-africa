export function patchFarWaterPredicate(source){
 const from='world.nav.field.waterInfo(data.positions[i*3],data.positions[i*3+2]).inside';
 if(source.split(from).length!==2)throw Error('Expected one original far-water predicate');
 return source.replace(from,'world.nav.field.fluidInside(data.positions[i*3],data.positions[i*3+2])');
}
