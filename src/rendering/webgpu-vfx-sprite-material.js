import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {attribute,cameraProjectionMatrix,cameraViewMatrix,clamp,cos,cross,distance,float,materialReference,min,mix,modelWorldMatrix,normalize,select,sin,smoothstep,texture,varying,vec2,vec3,vec4} from 'three/tsl';

// One graph per atlas; changing an effect's camera or light data never
// changes the graph. The physical pipeline still depends on render state,
// geometry layout, target and backend, which Three validates separately.
export function createWebGpuVfxSpriteGraph(atlas){
 if(!atlas?.isTexture)throw TypeError('Invalid VFX atlas');
 const references={eye:materialReference('_wgVfxEye','vec3'),right:materialReference('_wgVfxRight','vec3'),up:materialReference('_wgVfxUp','vec3'),particle:materialReference('_wgVfxParticle','vec3'),lightPos0:materialReference('_wgVfxLightPos0','vec3'),lightPos1:materialReference('_wgVfxLightPos1','vec3'),lightCol0:materialReference('_wgVfxLightCol0','vec3'),lightCol1:materialReference('_wgVfxLightCol1','vec3')};
 const {eye:uEye,right:uRight,up:uUp,particle:uParticle}=references,lightPos=[references.lightPos0,references.lightPos1],lightCol=[references.lightCol0,references.lightCol1];
 const corner=attribute('aCorner','vec2'),pos=attribute('iPos','vec3'),size=attribute('iSize','vec2'),angle=attribute('iAngle','float'),rect=attribute('iRect','vec4'),next=attribute('iNext','vec4'),color=attribute('iColor','vec4'),params=attribute('iParams','vec4'),direction=attribute('iDirection','vec3');
 const flat=params.y.greaterThan(.5).and(params.y.lessThan(1.5)),vertical=params.y.greaterThan(1.5).and(params.y.lessThan(2.5)),oriented=params.y.greaterThan(3.5),axial=params.y.greaterThan(2.5).and(params.y.lessThanEqual(3.5)),normal=normalize(direction),axis=select(normal.y.abs().greaterThan(.95),vec3(0,0,1),vec3(0,1,0)),orientedRight=normalize(cross(axis,normal)),uprightRight=normalize(cross(vec3(0,1,0),uEye.sub(pos))),axialRight=normalize(cross(normal,uEye.sub(pos)));
 const basisRight=select(flat,vec3(1,0,0),select(vertical,uprightRight,select(oriented,orientedRight,select(axial,axialRight,uRight)))),basisUp=select(flat,vec3(0,0,1),select(vertical,vec3(0,1,0),select(oriented,normalize(cross(normal,orientedRight)),select(axial,normal,uUp))));
 const c=cos(angle),s=sin(angle),q=vec2(c.mul(corner.x).sub(s.mul(corner.y)),s.mul(corner.x).add(c.mul(corner.y))).mul(size),world=pos.add(basisRight.mul(q.x)).add(basisUp.mul(q.y)),local=varying(corner.add(.5)),uv=varying(rect.xy.add(corner.add(.5).mul(rect.zw))),nextUv=varying(next.xy.add(corner.add(.5).mul(next.zw))),vColor=varying(color),vParams=varying(params),vWorld=varying(world);
 const vertexNode=cameraProjectionMatrix.mul(cameraViewMatrix).mul(modelWorldMatrix).mul(vec4(world,1)),sampled=mix(texture(atlas,uv),texture(atlas,nextUv),vParams.x),edge=min(min(local.x,float(1).sub(local.x)),min(local.y,float(1).sub(local.y))),alpha=sampled.a.mul(vColor.a).mul(smoothstep(0,.045,edge)).mul(smoothstep(.3,.75,distance(uEye,vWorld)));
 let illumination=uParticle;for(let i=0;i<2;i++)illumination=illumination.add(lightCol[i].div(float(1).add(vWorld.sub(lightPos[i]).dot(vWorld.sub(lightPos[i])).mul(3))).mul(.3));illumination=select(vParams.z.greaterThan(.01),vec3(min(vParams.z,1.6)),illumination);const x=sampled.rgb.mul(vColor.rgb).mul(illumination).mul(1.03).max(0),mapped=clamp(x.mul(x.mul(2.51).add(.03)).div(x.mul(x.mul(2.43).add(.59)).add(.14)),0,1).pow(1/2.2),outputNode=vec4(mapped,clamp(alpha,0,.94));
 return Object.freeze({vertexNode,outputNode,references:Object.freeze(references)});
}

export function createWebGpuVfxSpriteMaterial(graph){
 if(!graph?.vertexNode?.isNode||!graph?.outputNode?.isNode)throw TypeError('Invalid VFX sprite graph');
 const material=new MeshBasicNodeMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});material.vertexNode=graph.vertexNode;material.outputNode=graph.outputNode;
 material._wgVfxEye=new THREE.Vector3();material._wgVfxRight=new THREE.Vector3(1,0,0);material._wgVfxUp=new THREE.Vector3(0,1,0);material._wgVfxParticle=new THREE.Vector3(1,1,1);for(const suffix of ['LightPos0','LightPos1','LightCol0','LightCol1'])material['_wgVfx'+suffix]=new THREE.Vector3();
 return {material,uEye:{value:material._wgVfxEye},uRight:{value:material._wgVfxRight},uUp:{value:material._wgVfxUp},uParticle:{value:material._wgVfxParticle},lightPos:[{value:material._wgVfxLightPos0},{value:material._wgVfxLightPos1}],lightCol:[{value:material._wgVfxLightCol0},{value:material._wgVfxLightCol1}]};
}
