import * as THREE from 'three';
import {paintedWaterMaterial} from './african-toon.js';
import {withDepthCaptureMaterials} from './depth-capture.js';

// Install only after a successful World constructor. Disposal cannot erase a
// newer World's callback, even if another resource cleanup subsequently throws.
export function installPaintedFluidDepthProbe(world){
  if(globalThis.__desktopSmokeFluidDepth!==true||world.disposed||world.loading?.signal.aborted)return ()=>{};
  const callback=()=>probePaintedFluidDepth(world);
  globalThis.__desktopSmokeFluidDepthProbe=callback;
  let released=false;
  const release=()=>{if(released)return;released=true;world.loading?.signal.removeEventListener('abort',release);if(globalThis.__desktopSmokeFluidDepthProbe===callback)delete globalThis.__desktopSmokeFluidDepthProbe;};
  world.loading?.signal.addEventListener('abort',release,{once:true});
  return release;
}

// Diagnostic only: read the actual depth attachment, never color/alpha coverage.
export function comparePackedFluidDepth(reference,candidate,tolerance=2/16777216){
  if(reference.length!==candidate.length||reference.length%4)throw Error('Invalid packed depth buffers');
  const depth=(bytes,i)=>bytes[i]/256+bytes[i+1]/65536+bytes[i+2]/16777216+bytes[i+3]/4278190080;
  let mismatches=0,maxDelta=0,occupied=0,clear=0;
  for(let i=0;i<reference.length;i+=4){
    const a=depth(reference,i),b=depth(candidate,i),delta=Math.abs(a-b);
    const empty=reference[i]===255&&reference[i+1]===255&&reference[i+2]===255&&reference[i+3]===255;
    if(empty)clear++;else occupied++;
    maxDelta=Math.max(maxDelta,delta);if(delta>tolerance)mismatches++;
  }
  return {mismatches,maxDelta,occupied,clear,pixels:reference.length/4,tolerance};
}

export function probePaintedFluidDepth(world){
  const renderer=world.renderer,size=16;
  const check=()=>{if(world.disposed||world.loading?.signal.aborted||renderer.getContext().isContextLost())throw Error('Fluid depth probe cancelled');};
  check();if(globalThis.__desktopSmokeFluidDepth!==true)throw Error('Fluid depth probe requires explicit smoke option');
  if(renderer.capabilities.reverseDepthBuffer)throw Error('Fluid depth probe requires conventional depth');
  // Snapshot before allocating private resources. No borrowed material is mutated.
  const state={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),level:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,shadow:renderer.shadowMap.enabled,xr:renderer.xr.enabled};
  const owned=[],own=value=>{owned.push(value);return value;},steps=[];
  const identity=material=>{const program=renderer.properties.get(material).currentProgram;return {id:program?.id??null,cacheKey:program?.cacheKey??null};};
  let scene,packScene;
  try{
    const target=new THREE.WebGLRenderTarget(size,size,{depthBuffer:true,stencilBuffer:false});
    // WebGLTextures deallocates an initialized target's depth texture. Before
    // initialization no such listener exists: release it ourselves only then.
    let depthDisposed=false;
    own({dispose(){try{target.dispose();}finally{if(target.depthTexture&&!depthDisposed)target.depthTexture.dispose();}}});
    target.depthTexture=new THREE.DepthTexture(size,size,THREE.UnsignedIntType);
    target.depthTexture.addEventListener('dispose',()=>{depthDisposed=true;});
    const packed=own(new THREE.WebGLRenderTarget(size,size,{depthBuffer:false,stencilBuffer:false}));
    packed.texture.colorSpace=THREE.NoColorSpace;
    const packGeometry=own(new THREE.PlaneGeometry(2,2));
    const packMaterial=own(new THREE.ShaderMaterial({uniforms:{sourceDepth:{value:target.depthTexture}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'#include <packing>\nvarying vec2 vUv;uniform sampler2D sourceDepth;void main(){gl_FragColor=packDepthToRGBA(texture2D(sourceDepth,vUv).x);}',depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false}));
    packScene=new THREE.Scene();packScene.add(new THREE.Mesh(packGeometry,packMaterial));
    const packCamera=new THREE.Camera(),camera=new THREE.OrthographicCamera(-1.5,1.5,1.5,-1.5,.1,10);
    camera.up.set(0,0,-1);camera.position.set(0,4,0);camera.lookAt(0,0,0);
    scene=new THREE.Scene();scene.add(new THREE.AmbientLight(0xffffff,1));
    const make=(form,material)=>{
      const geometry=own(new THREE.PlaneGeometry(2,2,2,2).rotateX(-Math.PI/2));
      let mesh;
      if(form==='morph'){
        const positions=geometry.attributes.position.array.slice();for(let i=1;i<positions.length;i+=3)positions[i]+=.3;
        geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(positions,3)];mesh=new THREE.Mesh(geometry,material);mesh.morphTargetInfluences[0]=.7;
      }else if(form==='skinned'){
        geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(geometry.attributes.position.count*4),4));
        const weights=new Float32Array(geometry.attributes.position.count*4);for(let i=0;i<weights.length;i+=4)weights[i]=1;
        geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));mesh=new THREE.SkinnedMesh(geometry,material);
        const bone=new THREE.Bone();mesh.add(bone);const skeleton=own(new THREE.Skeleton([bone]));mesh.bind(skeleton);bone.position.y=.2;
      }else if(form==='instanced'){
        mesh=own(new THREE.InstancedMesh(geometry,material,1));mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(.2,.15,0));
      }else if(form==='batched'){
        mesh=own(new THREE.BatchedMesh(1,geometry.attributes.position.count,geometry.index.count,material));const id=mesh.addInstance(mesh.addGeometry(geometry));mesh.setMatrixAt(id,new THREE.Matrix4().makeTranslation(.2,.15,0));
      }else mesh=new THREE.Mesh(geometry,material);
      if(form==='displaced'){
        const texture=own(new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1));texture.needsUpdate=true;material.displacementMap=texture;material.displacementScale=.3;material.needsUpdate=true;
      }
      mesh.position.set(.1,.05,-.1);mesh.frustumCulled=false;return mesh;
    };
    try{
      renderer.autoClear=false;renderer.shadowMap.enabled=false;renderer.xr.enabled=false;renderer.setScissorTest(false);renderer.setClearColor(0,0);
      for(const lava of [false,true]){
        const material=own(paintedWaterMaterial(lava?'#e46b25':'#387dad',lava,712,[-.6,-.6,.6,.6]));
        const uniform=material.userData.paintUniforms;
        for(const form of ['plain','instanced','batched','morph','skinned','displaced']){
          const mesh=make(form,material);scene.add(mesh);scene.updateMatrixWorld(true);
          for(const mode of (form==='plain'?['disabled','inside','outside','moved']:['inside','outside'])){
            uniform.uFluidClip.value=mode==='disabled'?0:mode==='outside'?2:1;
            uniform.uFluidBounds.value.set(...(mode==='moved'?[.1,-.9,1.1,.1]:[-.6,-.6,.6,.6]));
            const captures=[];
            for(const optimized of [false,true]){
              check();renderer.setRenderTarget(target);renderer.setViewport(0,0,size,size);renderer.clear(true,true,true);
              let program;
              const stats=withDepthCaptureMaterials(scene,()=>{renderer.render(scene,camera);program=identity(mesh.material);},{optimized});
              renderer.setRenderTarget(packed);renderer.setViewport(0,0,size,size);renderer.clear(true,false,false);renderer.render(packScene,packCamera);
              const bytes=new Uint8Array(size*size*4);renderer.readRenderTargetPixels(packed,0,0,size,size,bytes);check();captures.push({bytes,program,stats});
            }
            if(captures[0].stats.fallback!==1||captures[1].stats.specialized!==1)throw Error('Fluid depth probe did not exercise both recipes');
            const comparison=comparePackedFluidDepth(captures[0].bytes,captures[1].bytes);
            steps.push({lava,form,mode,...comparison,fallback:captures[0].program,depth:captures[1].program,stats:captures.map(c=>c.stats),bounds:uniform.uFluidBounds.value.toArray()});
            if(comparison.mismatches||!comparison.occupied||(mode!=='disabled'&&!comparison.clear))throw Error('Fluid depth raster mismatch/empty coverage: '+[lava,form,mode].join('/'));
          }
          scene.remove(mesh);
        }
      }
      return {passed:true,steps,packingProgram:identity(packMaterial),scope:'Private 16x16 offscreen depth attachment, packed by an explicit QA RGBA pass using the prepared World renderer. Full authored colorWrite=false fallback versus specialized depth; offscreen program identities are not screen identity proof. No World materials/state altered.'};
    }finally{
      let error;for(const restore of [()=>renderer.setRenderTarget(state.target,state.face,state.level),()=>renderer.setViewport(state.viewport),()=>renderer.setScissor(state.scissor),()=>renderer.setScissorTest(state.scissorTest),()=>renderer.setClearColor(state.clear,state.alpha),()=>{renderer.autoClear=state.autoClear;renderer.shadowMap.enabled=state.shadow;renderer.xr.enabled=state.xr;}]){try{restore();}catch(failure){error??=failure;}}if(error)throw error;
    }
  }finally{
    let error;for(const resource of owned.reverse()){try{resource.dispose();}catch(failure){error??=failure;}}scene?.clear();packScene?.clear();if(error)throw error;
  }
}
