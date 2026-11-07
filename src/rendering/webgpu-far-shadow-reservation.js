// A shadow-only layer keeps the 3D silhouette out of colour/Hi-SSR captures
// without dropping its cast shadow. All world render cameras must be supplied.
export function createWebGpuFarShadowReservation({scene,camera,shadowLights,auxiliaryCameras=[],renderer=null,layer=30}={}){
 if(!scene?.isScene||!camera?.isCamera||!Array.isArray(shadowLights)||!shadowLights.length||shadowLights.some(light=>!light?.isLight||!light.castShadow||!light.shadow?.camera?.isCamera)||new Set(shadowLights).size!==shadowLights.length||!Array.isArray(auxiliaryCameras)||auxiliaryCameras.some(item=>!item?.isCamera)||renderer!==null&&!renderer?.shadowMap||!Number.isInteger(layer)||layer<1||layer>30)throw TypeError('Invalid far shadow reservation');
 const bit=1<<layer,allCameras=[camera,...auxiliaryCameras],shadowCameras=shadowLights.map(light=>light.shadow.camera),approved=new WeakSet();let closed=false,casters=0,suspended=false;
 function safe({installed=false}={}){const seen=new Set();let ok=(!renderer||renderer.shadowMap.enabled===true)&&allCameras.every(item=>!(item.layers.mask&bit))&&shadowLights.every((light,index)=>light.castShadow&&light.shadow?.camera===shadowCameras[index]&&(installed?!!(shadowCameras[index].layers.mask&bit):!(shadowCameras[index].layers.mask&bit)));scene.traverse(object=>{if(!ok)return;if(object.isLight&&object.castShadow){if(!shadowLights.includes(object))ok=false;else seen.add(object);}if((object.isMesh||object.isPoints||object.isLine||object.isSprite)&&(object.layers.mask&bit)&&!approved.has(object))ok=false;});return ok&&shadowLights.every(light=>seen.has(light));}
 if(!safe()||shadowCameras.some(item=>item.layers.mask&bit))throw Error('Far shadow layer unavailable');
 // An idle reservation must not add a layer to the shadow pass: otherwise a
 // foreign object could start casting before its next validation. Enable it
 // only after checking the complete scene, and keep it until the final
 // registered candidate has actually been released after GPU work.
 return {layer,shadowCameras,auxiliaryCameras:[...auxiliaryCameras],hasCasters:()=>!closed&&casters>0,registerCaster(object){if(closed||!object?.isMesh||object.userData?.wgFarShadow!==true||approved.has(object))throw TypeError('Invalid far shadow caster');if(suspended||!safe({installed:casters>0}))throw Error('Far shadow layer unavailable');if(casters===0)for(const item of shadowCameras)item.layers.enable(layer);approved.add(object);casters++;let released=false;return ()=>{if(released)return;released=true;approved.delete(object);casters--;if(!closed&&casters===0)for(const item of shadowCameras)item.layers.disable(layer);};},valid:()=>!closed&&!suspended&&safe({installed:casters>0}),suspend(){if(closed)return false;suspended=true;for(const item of shadowCameras)item.layers.disable(layer);return true;},recover(){if(closed||!suspended||casters!==0||!safe())return false;suspended=false;return true;},dispose(){if(closed)return;closed=true;for(const item of shadowCameras)item.layers.disable(layer);}};
}

// Called once per frame by the graphical owner. While no caster has been
// registered the layer is disabled, so there is nothing to inspect in the
// scene. On collision, restore the 3D coverage *before* disabling the layer;
// deferred GPU releases must complete before another admission can use it.
export function advanceWebGpuFarShadow(reservation,coverage,suspended){
 if(!reservation){if(!suspended)coverage.invalidate({reason:'shadow'});return true;}
 if(suspended){if(reservation.recover()){coverage.retry();coverage.pump();return false;}return true;}
 if(reservation.hasCasters()&&!reservation.valid()){coverage.invalidate({reason:'shadow'});reservation.suspend();return true;}
 coverage.pump();return false;
}
