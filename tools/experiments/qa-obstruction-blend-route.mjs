// QA: split only partially obscured color instances into sortable transparent draws.
export async function installObstructionBlendRoute(page,{singleSurface=false,cheapDepth=false}={}){
 await page.route('**/src/rendering/asset-groups.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchors=['retire(cache,key,retainGeometry=false){const g=cache.get(key);','const matrix=new THREE.Matrix4();let offset=0;','matrix.toArray(g.mesh.instanceMatrix.array,offset*16);','g.mesh.count=offset;'];
  if(!anchors.every(a=>body.includes(a)))throw Error('Obstruction blend anchor missing');
  body=body.replace(anchors[0],anchors[0]+`for(const fade of g.qaFades??[]){fade.removeFromParent();fade.geometry.dispose();fade.material.dispose();fade.dispose();}`);
  body=body.replace(anchors[1],'const matrix=new THREE.Matrix4();let offset=0,qaFadeCount=0;');
  body=body.replace(anchors[2],`
        const qaVisibility=e.mesh.geometry.attributes.nativeVisibility?.array[i]??1;
        if(pass==='color'&&qaVisibility<.999){
          if(qaVisibility<.002)continue;
          g.qaFades??=[];let fade=g.qaFades[qaFadeCount];
          if(!fade){
            const base=source.material,material=base.clone(),compile=base.onBeforeCompile,cacheKey=base.customProgramCacheKey.bind(base);
            material.transparent=true;material.depthWrite=false;material.alphaToCoverage=false;material.forceSinglePass=true;
            material.onBeforeCompile=(shader,renderer)=>{compile.call(base,shader,renderer);
              shader.fragmentShader=shader.fragmentShader.replace('if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}','if(vNativeVisibility<.002)discard;');
              shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=clamp(vNativeVisibility,0.,1.);\\n#include <opaque_fragment>');
            };
            material.customProgramCacheKey=()=>cacheKey()+'|qa-partial-blend';
            fade=new THREE.InstancedMesh(geometryView(source.geometry,1),material,1);fade.name='qa-obstruction-blend';fade.userData.materialRegistryExcluded=true;fade.receiveShadow=true;this.root.add(fade);g.qaFades.push(fade);
          }
          matrix.toArray(fade.instanceMatrix.array);fade.instanceMatrix.needsUpdate=true;
          fade.geometry.attributes.nativeVisibility.array[0]=qaVisibility;fade.geometry.attributes.nativeVisibility.needsUpdate=true;
          fade.boundingSphere=null;fade.boundingBox=null;fade.visible=true;qaFadeCount++;continue;
        }
        `+anchors[2]);
  body=body.replace(anchors[3],"for(let i=qaFadeCount;i<(g.qaFades?.length??0);i++)g.qaFades[i].visible=false;"+anchors[3]);
  if(singleSurface){
    body=body.replace('fade.removeFromParent();fade.geometry.dispose();', 'if(fade.qaDepth){fade.qaDepth.removeFromParent();fade.qaDepth.material.dispose();fade.qaDepth.dispose();}fade.removeFromParent();fade.geometry.dispose();');
    body=body.replace('g.qaFades.push(fade);',`g.qaFades.push(fade);
      const depthMaterial=material.clone();depthMaterial.transparent=false;depthMaterial.depthWrite=true;depthMaterial.colorWrite=false;depthMaterial.onBeforeCompile=material.onBeforeCompile;depthMaterial.customProgramCacheKey=()=>cacheKey()+'|qa-partial-surface-depth';
      fade.qaDepth=new THREE.InstancedMesh(fade.geometry,depthMaterial,1);fade.qaDepth.renderOrder=100000;fade.qaDepth.name='qa-obstruction-surface-depth';fade.qaDepth.userData.materialRegistryExcluded=true;this.root.add(fade.qaDepth);material.depthFunc=THREE.EqualDepth;
    `);
    body=body.replace('fade.visible=true;qaFadeCount++;', 'fade.visible=true;if(fade.qaDepth){matrix.toArray(fade.qaDepth.instanceMatrix.array);fade.qaDepth.instanceMatrix.needsUpdate=true;fade.qaDepth.boundingSphere=null;fade.qaDepth.boundingBox=null;fade.qaDepth.visible=true;}qaFadeCount++;');
    body=body.replace('g.qaFades[i].visible=false;', '{g.qaFades[i].visible=false;if(g.qaFades[i].qaDepth)g.qaFades[i].qaDepth.visible=false;}');
  }
  if(cheapDepth){
    if(!singleSurface)throw Error('Depth-only variant requires singleSurface');
    body="import {standardDepthMaterial} from '/src/rendering/standard-depth.js';\n"+body;
    const full="const depthMaterial=material.clone();depthMaterial.transparent=false;depthMaterial.depthWrite=true;depthMaterial.colorWrite=false;depthMaterial.onBeforeCompile=material.onBeforeCompile;depthMaterial.customProgramCacheKey=()=>cacheKey()+'|qa-partial-surface-depth';";
    if(!body.includes(full))throw Error('Depth-only QA anchor missing');
    body=body.replace(full,`const depthSource=standardDepthMaterial(base);if(!depthSource)throw Error('Unsupported partial depth recipe');
      const depthMaterial=depthSource.clone();depthMaterial.colorWrite=false;depthMaterial.depthWrite=true;
      depthMaterial.onBeforeCompile=(shader,renderer)=>{depthSource.onBeforeCompile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}','if(vNativeVisibility<.002)discard;');};
      depthMaterial.customProgramCacheKey=()=>depthSource.customProgramCacheKey()+'|qa-partial-depth-only';
    `);
  }
  await route.fulfill({response,body});
 });
}
