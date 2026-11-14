import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {Fn,If,attribute,cameraFar,cameraNear,cameraProjectionMatrix,cameraViewMatrix,clamp,cos,cross,distance,float,reference,min,mix,modelWorldMatrix,normalize,orthographicDepthToViewZ,perspectiveDepthToViewZ,screenUV,select,sin,smoothstep,texture,varying,vec2,vec3,vec4} from 'three/tsl';
import {catalogVfxSpriteGraph,vfxSpriteRecipe} from './webgpu-material-graph-catalog.js';

// One graph per atlas; changing an effect's camera or light data never
// changes the graph. The physical pipeline still depends on render state,
// geometry layout, target and backend, which Three validates separately.
const softGraphs=new WeakMap();

// Keep this binding shared across effects and replace only its texture on resize.
// It must be a non-comparison DepthTexture captured with the same camera/viewport.
export function createWebGpuVfxSoftDepth(depthTexture){
 if(!depthTexture?.isDepthTexture||depthTexture.compareFunction!==null)throw TypeError('Invalid VFX depth texture');
 // Explicit LOD avoids implicit derivatives in the conditional fragment branch.
 const depthNode=texture(depthTexture,screenUV).level(0);
 return Object.freeze({depthNode,setDepthTexture(next){if(!next?.isDepthTexture||next.compareFunction!==null)throw TypeError('Invalid VFX depth texture');depthNode.value=next;}});
}

export function createWebGpuVfxSpriteGraph(atlas,softDepth=null,temporalNodes=null){
 if(!atlas?.isTexture)throw TypeError('Invalid VFX atlas');
 if(softDepth!==null&&!softDepth?.depthNode?.isTextureNode)throw TypeError('Invalid VFX soft depth binding');
 const build=(recipe,includeSoft=Boolean(softDepth))=>{
 const references={eye:reference('_wgVfxEye','vec3'),right:reference('_wgVfxRight','vec3'),up:reference('_wgVfxUp','vec3'),particle:reference('_wgVfxParticle','vec3'),lightPos0:reference('_wgVfxLightPos0','vec3'),lightPos1:reference('_wgVfxLightPos1','vec3'),lightCol0:reference('_wgVfxLightCol0','vec3'),lightCol1:reference('_wgVfxLightCol1','vec3')};
 if(includeSoft){references.softDepth=reference('_wgVfxSoftDepth','float');references.softDepthScale=reference('_wgVfxSoftDepthScale','float');}
 const uEye=temporalNodes?.eye??references.eye,uRight=temporalNodes?.right??references.right,uUp=temporalNodes?.up??references.up,uParticle=references.particle,lightPos=[references.lightPos0,references.lightPos1],lightCol=[references.lightCol0,references.lightCol1];
 const corner=attribute('aCorner','vec2'),pos=temporalNodes?.pos??attribute('iPos','vec3'),size=temporalNodes?.size??attribute('iSize','vec2'),angle=temporalNodes?.angle??attribute('iAngle','float'),rect=temporalNodes?.rect??attribute('iRect','vec4'),next=temporalNodes?.next??attribute('iNext','vec4'),color=temporalNodes?.color??attribute('iColor','vec4'),params=temporalNodes?.params??attribute('iParams','vec4'),direction=temporalNodes?.direction??attribute('iDirection','vec3');
 const flat=params.y.greaterThan(.5).and(params.y.lessThan(1.5)),vertical=params.y.greaterThan(1.5).and(params.y.lessThan(2.5)),oriented=params.y.greaterThan(3.5),axial=params.y.greaterThan(2.5).and(params.y.lessThanEqual(3.5)),normal=normalize(direction),axis=select(normal.y.abs().greaterThan(.95),vec3(0,0,1),vec3(0,1,0)),orientedRight=normalize(cross(axis,normal)),uprightRight=normalize(cross(vec3(0,1,0),uEye.sub(pos))),axialRight=normalize(cross(normal,uEye.sub(pos)));
 const basisRight=select(flat,vec3(1,0,0),select(vertical,uprightRight,select(oriented,orientedRight,select(axial,axialRight,uRight)))),basisUp=select(flat,vec3(0,0,1),select(vertical,vec3(0,1,0),select(oriented,normalize(cross(normal,orientedRight)),select(axial,normal,uUp))));
 const c=cos(angle),s=sin(angle),q=vec2(c.mul(corner.x).sub(s.mul(corner.y)),s.mul(corner.x).add(c.mul(corner.y))).mul(size),world=pos.add(basisRight.mul(q.x)).add(basisUp.mul(q.y)),local=varying(corner.add(.5)),uv=varying(rect.xy.add(corner.add(.5).mul(rect.zw))),nextUv=varying(next.xy.add(corner.add(.5).mul(next.zw))),vColor=varying(color),vParams=varying(params),vWorld=varying(world);
 const viewPosition=cameraViewMatrix.mul(modelWorldMatrix).mul(vec4(world,1)),vertexNode=cameraProjectionMatrix.mul(viewPosition),sampled=mix(texture(atlas,uv),texture(atlas,nextUv),vParams.x),edge=min(min(local.x,float(1).sub(local.x)),min(local.y,float(1).sub(local.y)));let alpha=sampled.a.mul(vColor.a).mul(smoothstep(0,.045,edge)).mul(smoothstep(.3,.75,distance(uEye,vWorld)));
 if(includeSoft){const hereZ=varying(viewPosition.z),fade=Fn(()=>{const result=float(1).toVar();If(references.softDepth.greaterThan(.5).and(vParams.w.greaterThan(0)),()=>{const depth=softDepth.depthNode.r,perspective=cameraProjectionMatrix.element(2).element(3).abs().greaterThan(.5),groundZ=select(perspective,perspectiveDepthToViewZ(depth,cameraNear,cameraFar),orthographicDepthToViewZ(depth,cameraNear,cameraFar));result.assign(smoothstep(0,vParams.w.mul(references.softDepthScale).max(.000001),hereZ.sub(groundZ)));});return result;})();alpha=alpha.mul(fade);}
 let illumination=uParticle;for(let i=0;i<2;i++)illumination=illumination.add(lightCol[i].div(float(1).add(vWorld.sub(lightPos[i]).dot(vWorld.sub(lightPos[i])).mul(3))).mul(.3));illumination=select(vParams.z.greaterThan(.01),vec3(min(vParams.z,1.6)),illumination);const x=sampled.rgb.mul(vColor.rgb).mul(illumination).mul(1.03).max(0),mapped=clamp(x.mul(x.mul(2.51).add(.03)).div(x.mul(x.mul(2.43).add(.59)).add(.14)),0,1).pow(1/2.2),outputNode=vec4(mapped,clamp(alpha,0,.94));
 return Object.freeze({vertexNode,outputNode,references:Object.freeze(references),recipe});
 };
 if(temporalNodes)return build(vfxSpriteRecipe(atlas));
 if(!softDepth)return catalogVfxSpriteGraph(atlas,build);
 // Preserve the normal atlas/recipe cache and add an independent optional graph
 // per shared depth binding. Texture replacements do not change its identity.
 const base=catalogVfxSpriteGraph(atlas,recipe=>build(recipe,false));let byAtlas=softGraphs.get(softDepth);if(!byAtlas){byAtlas=new WeakMap();softGraphs.set(softDepth,byAtlas);}let byRecipe=byAtlas.get(atlas);if(!byRecipe){byRecipe=new Map();byAtlas.set(atlas,byRecipe);}let graph=byRecipe.get(base.recipe.key);if(!graph){graph=build(base.recipe,true);byRecipe.set(base.recipe.key,graph);}return graph;
}

export function createWebGpuVfxSpriteMaterial(graph){
 if(!graph?.vertexNode?.isNode||!graph?.outputNode?.isNode||graph.recipe?.structural?.family!=='vfx-sprites')throw TypeError('Invalid VFX sprite graph');
 const material=new MeshBasicNodeMaterial(graph.recipe.structural.state);material.vertexNode=graph.vertexNode;material.outputNode=graph.outputNode;return material;
}

// The material and its graph are shared; the references read the current
// render object, so overlapping effects cannot overwrite each other's data.
export function bindWebGpuVfxSpriteObject(object){
 if(!object?.isMesh)throw TypeError('Invalid VFX sprite object');
 object._wgVfxEye=new THREE.Vector3();object._wgVfxRight=new THREE.Vector3(1,0,0);object._wgVfxUp=new THREE.Vector3(0,1,0);object._wgVfxParticle=new THREE.Vector3(1,1,1);object._wgVfxSoftDepth=0;object._wgVfxSoftDepthScale=1;for(const suffix of ['LightPos0','LightPos1','LightCol0','LightCol1'])object['_wgVfx'+suffix]=new THREE.Vector3();
 return {uEye:{value:object._wgVfxEye},uRight:{value:object._wgVfxRight},uUp:{value:object._wgVfxUp},uParticle:{value:object._wgVfxParticle},uSoftDepth:{get value(){return object._wgVfxSoftDepth;},set value(v){object._wgVfxSoftDepth=v?1:0;}},uSoftDepthScale:{get value(){return object._wgVfxSoftDepthScale;},set value(v){object._wgVfxSoftDepthScale=v;}},lightPos:[{value:object._wgVfxLightPos0},{value:object._wgVfxLightPos1}],lightCol:[{value:object._wgVfxLightCol0},{value:object._wgVfxLightCol1}]};
}
