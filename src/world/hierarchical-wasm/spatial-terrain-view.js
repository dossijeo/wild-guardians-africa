// Read-only game-facing terrain queries backed by the same C++ world that
// supplies chunk meshes and navigation. This does not run the JS terrain recipe.
export function createSpatialTerrainView(core){
  const {seed,biome}=core.terrainState();
  const canyon=biome==='canyons',wetland=biome==='mangrove',desert=biome==='desert';
  const surface=(x,z)=>core.surfaceAnywhere(x,z);
  const fluidInside=(x,z)=>core.fluidLevelAnywhere(x,z)>0;
  const waterInfo=(x,z)=>{
    const level=core.fluidLevelAnywhere(x,z),shore=core.waterShoreAnywhere(x,z);
    const info={shore,inside:level>0,level:level>0?level:null};
    if(wetland)info.mask=core.wetlandMaskAnywhere(x,z);
    return info;
  };
  return {
    seed,c:{seed:String(seed),biome,river:!desert&&!wetland},canyon,wetland,desert,
    riverActive:!desert&&!wetland,riverLevel:core.fluidSurfaceLevel(),
    surface,fluidInside,waterInfo,riverX:z=>core.riverCenter(z),
    wetlandLevel:()=>core.fluidSurfaceLevel(),
    slope:(x,z)=>Math.hypot(surface(x+.8,z)-surface(x-.8,z),
      surface(x,z+.8)-surface(x,z-.8))/1.6,
  };
}
