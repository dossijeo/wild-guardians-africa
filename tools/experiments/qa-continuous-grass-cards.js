import {applyMaterialStudy as base,THREE} from '/tools/experiments/qa-continuous-grass.js';
export async function applyMaterialStudy(world,variant='C'){
 await base(world,'C');const q=world.qaContinuousGrass;
 // Historical rejected study: keep the original 1x wind for reproducible comparisons.
 q.uniforms.uCoverageWindStrength.value=1;
 if(!q.cardsStudy){
 const data=await(await fetch('/assets/visual-lab/continuous-grass-cards/modules.json')).json();const atlas=await new THREE.TextureLoader().loadAsync('/assets/visual-lab/continuous-grass-cards/fibers.png');atlas.colorSpace=THREE.NoColorSpace;atlas.anisotropy=4;
 q.cardsStudy={data,atlas,enabled:false};
 for(let i=0;i<q.meshes.length;i++){const e=q.meshes[i],d=data[i===0?'refined':'light'];e.originalGeometry=e.mesh.geometry;const g=new THREE.InstancedBufferGeometry();
 for(const [name,size]of [['position',3],['normal',3],['flatPosition',3],['bladeRoot',3],['uv',2],['cardUv',2]])g.setAttribute(name,new THREE.Float32BufferAttribute(d[name],size));g.setIndex(d.index);
 for(const name of ['coverageAnchor','coverageData','coverageSlope'])g.setAttribute(name,e.originalGeometry.attributes[name]);g.instanceCount=0;e.cardGeometry=g;
 const m=e.mesh.material;m.uniforms.uCardEnabled={value:0};m.uniforms.uCardRaw={value:0};m.uniforms.uCardAtlas={value:atlas};m.defaultAttributeValues.cardUv=[0,0];
 m.vertexShader='in vec2 cardUv;out vec2 vCardUv;\n'+m.vertexShader.replace('void main(){','void main(){vCardUv=cardUv;');
 m.fragmentShader='in vec2 vCardUv;uniform sampler2D uCardAtlas;uniform float uCardEnabled,uCardRaw;\n'+m.fragmentShader.replace('void main(){',`void main(){vec4 fiber=vec4(1.);if(uCardEnabled>.5){fiber=texture(uCardAtlas,vCardUv);if(uCardRaw<.5&&fiber.a<.45)discard;}`)
 .replace('#include <colorspace_fragment>', 'if(uCardEnabled>.5){gl_FragColor.rgb*=mix(.65,1.,fiber.r);gl_FragColor.a=fiber.a;}\n #include <colorspace_fragment>');m.needsUpdate=true;
 }
 const audit=q.audit;q.audit=()=>({...audit(),representation:q.cardsStudy.enabled?'curved-cutout-cards':'opaque-fibers',triangles:q.meshes.reduce((n,e)=>n+e.mesh.geometry.instanceCount*e.mesh.geometry.index.count/3,0),apparentFibers:q.cardsStudy.enabled?q.near*72+q.far*48:undefined});
 const dispose=q.dispose;q.dispose=()=>{for(const e of q.meshes){e.mesh.geometry=e.originalGeometry;e.cardGeometry.dispose()}atlas.dispose();dispose()};
 }
 q.cardsStudy.enabled=variant==='cards';
 for(const e of q.meshes){e.mesh.geometry=q.cardsStudy.enabled?e.cardGeometry:e.originalGeometry;e.mesh.material.uniforms.uCardEnabled.value=q.cardsStudy.enabled?1:0;e.mesh.material.alphaToCoverage=q.cardsStudy.enabled;}
 q.dirty=true;return q.audit();
}
