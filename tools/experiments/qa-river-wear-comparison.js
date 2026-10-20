export async function applyComparison(world,variant){
 world.qaContinuousGrass?.dispose();
 const helper=await import(variant==='candidate'?'/tools/experiments/qa-river-wear-generated.js':'/tools/experiments/qa-continuous-grass-river.js');
 const start=performance.now();await helper.applyMaterialStudy(world,'C');world.qaContinuousGrass.timeOverride=2;world.render(.016);
 return {variant,setupMs:performance.now()-start,...world.qaContinuousGrass.audit()};
}
