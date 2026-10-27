import * as THREE from '/node_modules/three/build/three.module.js';
import {applyHollyFern as applyBase} from './qa-holly-fern-shadow-10hz-20261023.js';
export async function applyHollyFern(world){
 await applyBase(world);const q=world.groundDetails;if(!q.qaShadowRegion)throw Error('QA resident region hook missing');
 const source=q.meshes[0].mesh,g=source.geometry.clone(),capacity=65536;
 for(const [name,size]of [['coverageAnchor',4],['coverageData',4],['coverageSlope',2]])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size));
 const depth=source.customDepthMaterial.clone();depth.uniforms={...source.customDepthMaterial.uniforms,uFernShadowCenter:{value:new THREE.Vector2()}};depth.vertexShader='uniform vec2 uFernShadowCenter;\n'+depth.vertexShader;
 depth.vertexShader=depth.vertexShader.replace('float farFade=1.-smoothstep(uCoverageFar-12.,uCoverageFar,distanceToEye);','float farFade=1.-smoothstep(uCoverageFar-24.,uCoverageFar-8.,length(root.xz-uFernShadowCenter));').replace('float lod=1.-smoothstep(18.,24.,distanceToEye);','float lod=1.;');
 depth.userData.nativeShadowInputs=()=>[depth.uniforms.uFernShadowCenter.value,depth.uniforms.uCoverageFar.value,depth.uniforms.uCoverageTime.value,depth.uniforms.uCoverageWindStrength.value,depth.uniforms.uCoverageSpacing.value,depth.uniforms.uCoverageRefined.value,depth.uniforms.uLeafCoverage.value];
 const proxy=new THREE.Mesh(g,source.material);proxy.onBeforeShadow=source.onBeforeShadow;proxy.onAfterShadow=source.onAfterShadow;proxy.name='qa-resident-fern-shadow';proxy.customDepthMaterial=depth;proxy.castShadow=true;proxy.frustumCulled=false;proxy.matrixAutoUpdate=false;
 for(const e of q.meshes)e.mesh.castShadow=false;
 let key='',revision=0;const dirty=q.markDirtyAt.bind(q);q.markDirtyAt=(...args)=>{revision++;return dirty(...args);};
 for(const name of ['chunk','release','rebuild']){const original=q[name];q[name]=(...args)=>{const result=original(...args);revision++;return result;};}
 const flush=q.flush;q.flush=(...args)=>{const changed=q.occupancyDirty;const result=flush(...args);if(changed)revision++;return result;};
 const map=world.renderer.shadowMap,previous=map.render,stats={rebuilds:0,instances:0,capacity,overflow:0,active:false};
 function render(lights,scene,camera){if(scene!==world.scene)return previous.call(this,lights,scene,camera);stats.active=q.enabled&&!q.disposed&&q.group.visible&&q.variant!=='A';if(!stats.active)return previous.call(this,lights,scene,camera);
 const x=Math.round((world.camera.position.x-scene.position.x)/8)*8,z=Math.round((world.camera.position.z-scene.position.z)/8)*8,next=[x,z,q.quality,revision,...q.chunks.keys()].join('|');
 depth.uniforms.uFernShadowCenter.value.set(world.camera.position.x-scene.position.x,world.camera.position.z-scene.position.z);
 if(next!==key){const items=q.qaShadowRegion(x,z,q.farDistance-2);stats.overflow=Math.max(0,items.length-capacity);if(stats.overflow)throw Error('Resident shadow capacity exceeded');
 for(let i=0;i<items.length;i++){const p=items[i];g.attributes.coverageAnchor.array.set(p.slice(0,4),i*4);g.attributes.coverageData.array.set(p.slice(4,8),i*4);g.attributes.coverageSlope.array.set(p.slice(8,10),i*2);}
 for(const name of ['coverageAnchor','coverageData','coverageSlope'])g.attributes[name].needsUpdate=true;g.instanceCount=items.length;stats.instances=items.length;stats.rebuilds++;key=next;}
 proxy.matrix.copy(scene.matrixWorld).invert().multiply(q.group.matrixWorld);scene.add(proxy);proxy.updateMatrixWorld(true);
 try{return previous.call(this,lights,scene,camera);}finally{scene.remove(proxy);}}
 map.render=render;const dispose=q.dispose.bind(q);q.dispose=()=>{if(map.render===render)map.render=previous;proxy.removeFromParent();g.dispose();depth.dispose();dispose();};
 q.residentShadowStudy=stats;return stats;
}
