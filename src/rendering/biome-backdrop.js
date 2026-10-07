import * as THREE from 'three';
import {farAtmosphere} from './far-atmosphere.js';
import {createMountainArcGeometry} from './mountain-arcs.js';
// Decorative biome silhouettes intentionally have no procedural-world identity.
// They sit beyond faithful vegetation and move with a small, bounded parallax.
export function createBiomeBackdrop(world,texture,{radius=430,height=null,parallax=.03,fogMix=null,fogBaseMix=null,mirrored=false,arcLayout=null,stableAltitude=arcLayout!==null,nightTint=[.187675676,.302022472,.661818182],fogDayColor='#b5d9e8',fogNightColor='#263747'}={}){
 farAtmosphere({fogDayColor,fogNightColor});
 if(![radius,parallax].every(Number.isFinite)||radius<=0||parallax<0||parallax>1)throw Error('Invalid biome backdrop settings');
 if(typeof mirrored!=='boolean')throw Error('Invalid biome backdrop wrapping');
 height??={savanna:110,grand_river:85,mangrove:60,volcanoes:160,canyons:130,desert:115}[world.nav.config.biome];
 if(!Number.isFinite(height)||height<=0)throw Error('Invalid biome backdrop height');
 fogMix??=world.nav.config.biome==='savanna'?.24:.48;
 if(!Number.isFinite(fogMix)||fogMix<0||fogMix>1)throw Error('Invalid biome backdrop fog mix');
 fogBaseMix??=fogMix;
 if(!Number.isFinite(fogBaseMix)||fogBaseMix<fogMix||fogBaseMix>1)throw Error('Invalid biome backdrop base fog mix');
 if(!Array.isArray(nightTint)||nightTint.length!==3||!nightTint.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid biome backdrop night tint');
 if(arcLayout!==null&&!Array.isArray(arcLayout))throw Error('Invalid mountain arc layout');
 if(arcLayout&&mirrored)throw Error('Mountain arcs cannot mirror their atlas');
 if(typeof stableAltitude!=='boolean')throw Error('Invalid backdrop altitude policy');
 // The first procedural village is persisted with the world, so new games and
 // resumed games share a datum regardless of the camera's starting position.
 // Standalone render fixtures without a village use their initial camera site.
 const site=world.state?.villages?.[0]??world.camera.position;
 const altitude=stableAltitude?world.nav.field.surface(site.x,site.z):null;
 if(stableAltitude&&!Number.isFinite(altitude))throw Error('Invalid backdrop altitude');
 const geometry=arcLayout?createMountainArcGeometry(radius,arcLayout):new THREE.CylinderGeometry(radius,radius,height,64,1,true);
 texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;
 if(mirrored){texture.wrapS=THREE.MirroredRepeatWrapping;texture.needsUpdate=true;}
 const root=new THREE.Group(),anchor=world.camera.position.clone(),geometries=[],uniforms={uBackdropAtlas:{value:texture},uBackdropNight:world.toon.uniforms.uNight,uBackdropFog:{value:new THREE.Color('#b5d9e8')}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:false,depthWrite:false,toneMapped:false,side:THREE.BackSide,vertexShader:arcLayout?'attribute float backdropHeight;varying float vBackdropHeight;varying vec2 vBackdropUv;void main(){vBackdropUv=uv;vBackdropHeight=backdropHeight;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}':'varying vec2 vBackdropUv;void main(){vBackdropUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D uBackdropAtlas;uniform float uBackdropNight;uniform vec3 uBackdropFog;varying vec2 vBackdropUv;${arcLayout?'varying float vBackdropHeight;':''}
 void main(){vec4 c=texture2D(uBackdropAtlas,vBackdropUv);if(c.a<.35)discard;vec3 tint=mix(vec3(1.),vec3(${nightTint.map(v=>v.toFixed(9)).join(',')}),clamp(uBackdropNight,0.,1.));gl_FragColor=vec4(mix(c.rgb*tint,uBackdropFog,${fogBaseMix===fogMix?fogMix.toFixed(6):`mix(${fogMix.toFixed(6)},${fogBaseMix.toFixed(6)},(1.-${arcLayout?'vBackdropHeight':'vBackdropUv.y'})*(1.-${arcLayout?'vBackdropHeight':'vBackdropUv.y'}))`}),1.);
 #include <colorspace_fragment>
 }`});
 // Reflect the complete panorama around both ends. Identical texels meet at
 // each cylinder join, including mip filtering, with no extra shader sample.
 if(mirrored){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*2);}
 geometries.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.y=arcLayout?0:height/2-35;mesh.renderOrder=-1000;root.add(mesh);
 root.name='biome-2d-backdrop';world.scene.add(root);let closed=false;
 const fogDay=new THREE.Color(fogDayColor),fogNight=new THREE.Color(fogNightColor);
 return {root,update(){if(closed)return;root.position.set(world.camera.position.x-Math.tanh((world.camera.position.x-anchor.x)/1000)*1000*parallax,altitude??world.nav.field.surface(world.camera.position.x,world.camera.position.z),world.camera.position.z-Math.tanh((world.camera.position.z-anchor.z)/1000)*1000*parallax);uniforms.uBackdropFog.value.copy(fogDay).lerp(fogNight,world.toon.uniforms.uNight.value);},dispose(){if(closed)return;closed=true;root.removeFromParent();for(const geometry of geometries)geometry.dispose();material.dispose();}};
}
