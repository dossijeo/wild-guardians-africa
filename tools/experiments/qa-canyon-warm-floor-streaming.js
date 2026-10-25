// Reversible QA lifecycle adapter; never installed by normal game startup.
export function applyMaterialStudy(world){
 if(world.state.biome!=='gran-canon')throw Error('Canyon only');
 if(world.qaWarmFloor)return world.qaWarmFloor;
 const old=[.22,.27,.36],warm=[.38,.255,.18],l=[.2126,.7152,.0722],lum=a=>a.reduce((s,v,i)=>s+v*l[i],0),scale=lum(old)/lum(warm),color=warm.map(v=>v*scale);
 const anchor='vec3 biomeDirect=brdf4(toonN,toonV,uLightDir,groundAlbedo,groundRough,0.)*biomeSun*groundVisibility;';
 const bindings=new Map(),enabled={value:1};let compiled=0;
 const toon=world.toon,previous=toon.material,owned=Object.hasOwn(toon,'material');
 function bind(material){
  if(!material?.userData.biomeGround||!material.userData.toonGround||material.userData.groundBiome!=='canyons'||bindings.has(material))return;
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey;
  const patched=function(shader,renderer){compile.call(this,shader,renderer);if(!shader.fragmentShader.includes(anchor))throw Error('Mapped illumination anchor missing');shader.uniforms.uQAWarmFloor=enabled;shader.fragmentShader='uniform float uQAWarmFloor;\n'+shader.fragmentShader.replace(anchor,`
 float qaWarmWeight=uQAWarmFloor*smoothstep(0.,1.,clamp((1.-groundVisibility)/.93,0.,1.))*(1.-uNight)*smoothstep(.74,.96,toonN.y);
 biomeAmbient=mix(biomeAmbient,vec3(${color.join(',')}),qaWarmWeight);
 `+anchor);compiled++;};
  const patchedCache=function(){return cache.call(this)+'|qa-canyon-warm-floor-streaming'};
  const release=()=>{bindings.delete(material);material.removeEventListener('dispose',release)};
  bindings.set(material,{compile,cache,patched,patchedCache,release});material.onBeforeCompile=patched;material.customProgramCacheKey=patchedCache;material.addEventListener('dispose',release);material.needsUpdate=true;
 }
 const wrapped=function(material){const result=previous.call(this,material);bind(material);return result};toon.material=wrapped;
 world.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])bind(m)});
 const q={setEnabled(value){enabled.value=value?1:0},audit(){const terrain=world.terrainMeshes.map(m=>m.material),horizon=(world.horizon?.group?.children??[]).filter(m=>m.userData.nativeHorizon==='terrain').map(m=>m.material);return {bound:bindings.size,compiled,enabled:enabled.value,terrain:terrain.length,horizon:horizon.length,allTerrain:terrain.every(m=>bindings.has(m)),allHorizon:horizon.every(m=>bindings.has(m)),color};},dispose(){if(toon.material===wrapped){if(owned)toon.material=previous;else delete toon.material;}for(const [m,b]of bindings){if(m.onBeforeCompile===b.patched)m.onBeforeCompile=b.compile;if(m.customProgramCacheKey===b.patchedCache)m.customProgramCacheKey=b.cache;m.removeEventListener('dispose',b.release);m.needsUpdate=true;}bindings.clear();delete world.qaWarmFloor;}};
 world.qaWarmFloor=q;return q;
}
