import * as THREE from 'three';
export async function applyFernLod(world,q){
 const loader=new THREE.TextureLoader(),root='/assets/visual-lab/holly-fern-lod-20261023/';
 const results=await Promise.allSettled(['fern-day','fern-night','shadow-solar'].map(name=>loader.loadAsync(root+name+'.png')));
 if(results.some(r=>r.status==='rejected')||q.disposed||world.disposed||world.loading?.signal.aborted){for(const r of results)if(r.status==='fulfilled')r.value.dispose();throw Error('Fern LOD textures failed or loading cancelled');}
 const [day,night,shadow]=results.map(r=>r.value);
 for(const t of [day,night,shadow]){t.colorSpace=t===shadow?THREE.NoColorSpace:THREE.SRGBColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;}
 const vertex=`in vec4 coverageAnchor,coverageData;in vec2 coverageSlope;in vec2 cardUv;uniform float uCoverageFar;out vec2 vUv;out float vLayer;
 void main(){float a=coverageData.x,c=cos(a),s=sin(a);vec3 root=coverageAnchor.xyz;vec3 wr=(modelMatrix*vec4(root,1.)).xyz;float growth=1.-smoothstep(uCoverageFar-12.,uCoverageFar,length(cameraPosition.xz-wr.xz));vec3 p=position;p.xz=mat2(c,-s,s,c)*p.xz*growth;p.y=p.y*coverageAnchor.w*growth+dot(coverageSlope,p.xz);vUv=cardUv;vLayer=mod(floor(a/0.7853981634+.5)+8.,8.);gl_Position=projectionMatrix*modelViewMatrix*vec4(root+p,1.);}`;
 const fragment=`in vec2 vUv;in float vLayer;uniform sampler2D uDay,uNightMap;uniform float uNight;out vec4 result;
 void main(){vec2 uv=vec2((vLayer+clamp(vUv.x,.001,.999))/8.,clamp(vUv.y,.001,.999));vec4 c=mix(texture(uDay,uv),texture(uNightMap,uv),uNight);if(c.a<.5)discard;result=vec4(c.rgb,1.);
 #define gl_FragColor result
 #include <colorspace_fragment>
 }`;
 const shadowFragment=`in vec2 vUv;in float vLayer;uniform sampler2D uShadow;uniform float uNight;out vec4 result;void main(){vec2 uv=vec2((vLayer+clamp(vUv.x,.001,.999))/8.,clamp(vUv.y,.001,.999));float a=texture(uShadow,uv).a*.55*(1.-uNight);if(a<.005)discard;result=vec4(0.,0.,0.,a);}`;
 const retired=[],shadows=[];
 for(const e of q.meshes.slice(1)){const g=e.mesh.geometry,original=e.mesh.material;retired.push(original);const positions=[],uv=[],indices=[];
  for(let z=0;z<3;z++)for(let x=0;x<3;x++){const h=x===1&&z===1?.056:(x===1||z===1?.32:.22);positions.push((x-1)*1.4,h,(z-1)*1.4);uv.push(x/2,z/2);}
  for(let z=0;z<2;z++)for(let x=0;x<2;x++){const a=z*3+x;indices.push(a,a+3,a+1,a+1,a+3,a+4);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('cardUv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.boundingSphere=null;g.boundingBox=null;
  const uniforms={...original.uniforms,uDay:{value:day},uNightMap:{value:night},uShadow:{value:shadow}};
  e.mesh.material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms,vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,toneMapped:false});e.mesh.castShadow=false;
  const sg=new THREE.InstancedBufferGeometry();for(const name of ['coverageAnchor','coverageData','coverageSlope'])sg.setAttribute(name,g.attributes[name]);sg.setAttribute('position',new THREE.Float32BufferAttribute([-1.4,.015,-1.4,1.4,.015,-1.4,1.4,.015,1.4,-1.4,.015,1.4],3));sg.setAttribute('cardUv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));sg.setIndex([0,2,1,0,3,2]);
  const sm=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms,vertexShader:vertex,fragmentShader:shadowFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});const mesh=new THREE.Mesh(sg,sm);mesh.frustumCulled=false;mesh.name='fern-prebaked-shadow';e.mesh.parent.add(mesh);shadows.push({mesh,source:e.mesh});
 }
 q.syncLod=()=>{for(const e of shadows){e.mesh.geometry.instanceCount=e.source.geometry.instanceCount;e.mesh.visible=e.source.visible;}};
 q.screenLod=true;q.dirty=true;
 const dispose=q.dispose.bind(q);q.dispose=()=>{if(q.disposed)return;q.syncLod=null;for(const e of shadows){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();}retired.forEach(m=>m.dispose());[day,night,shadow].forEach(t=>t.dispose());dispose();};
 q.cardStudy.prelit={nearAndFar:false,nearNative:true,orientations:8,atlasWidth:2048,atlasHeight:256,solarShadowOpacity:.55,solarShadowQuad:true,liveNormalSampling:false,liveShadowCasting:false,liveWind:false,limitation:'Baked far-field lighting; static shadows cannot follow animated leaves or receive surrounding object shadows.'};world.releaseNativeShadow.cache.invalidate();
}
