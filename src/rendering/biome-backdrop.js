import * as THREE from 'three';
// Decorative biome silhouettes intentionally have no procedural-world identity.
// They sit beyond faithful vegetation and move with a small, bounded parallax.
export function createBiomeBackdrop(world,texture,{radius=430,width=400,height=null,parallax=.03}={}){
 if(![radius,width,parallax].every(Number.isFinite)||radius<=0||width<=0||parallax<0||parallax>1)throw Error('Invalid biome backdrop settings');
 height??={savanna:320,grand_river:380,mangrove:220,volcanoes:600,canyons:480,desert:440}[world.nav.config.biome];
 if(!Number.isFinite(height)||height<=0)throw Error('Invalid biome backdrop height');
 texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;
 const root=new THREE.Group(),anchor=world.camera.position.clone(),geometries=[],uniforms={uBackdropAtlas:{value:texture},uBackdropNight:world.toon.uniforms.uNight,uBackdropFog:{value:new THREE.Color('#b5d9e8')}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:false,depthWrite:false,toneMapped:false,side:THREE.FrontSide,vertexShader:'varying vec2 vBackdropUv;void main(){vBackdropUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D uBackdropAtlas;uniform float uBackdropNight;uniform vec3 uBackdropFog;varying vec2 vBackdropUv;
 void main(){vec4 c=texture2D(uBackdropAtlas,vBackdropUv);if(c.a<.35)discard;float cell=fract(vBackdropUv.x*8.);float edge=smoothstep(0.,.08,cell)*(1.-smoothstep(.92,1.,cell));if(fract(dot(floor(gl_FragCoord.xy),vec2(.754877666,.569840296)))>edge)discard;vec3 tint=mix(vec3(1.),vec3(.187675676,.302022472,.661818182),clamp(uBackdropNight,0.,1.));gl_FragColor=vec4(mix(c.rgb*tint,uBackdropFog,.48),1.);
 #include <colorspace_fragment>
 }`});
 for(let sector=0;sector<8;sector++){const geometry=new THREE.PlaneGeometry(width,height),uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,(sector+uv.getX(i))/8);geometries.push(geometry);const mesh=new THREE.Mesh(geometry,material),angle=sector*Math.PI/4;mesh.position.set(Math.sin(angle)*radius,height/2-35,Math.cos(angle)*radius);mesh.rotation.y=angle+Math.PI;mesh.renderOrder=-1000;root.add(mesh);}
 root.name='biome-2d-backdrop';world.scene.add(root);let closed=false;
 const fogDay=new THREE.Color('#b5d9e8'),fogNight=new THREE.Color('#263747');
 return {root,update(){if(closed)return;root.position.set(world.camera.position.x-Math.tanh((world.camera.position.x-anchor.x)/1000)*1000*parallax,world.nav.field.surface(world.camera.position.x,world.camera.position.z),world.camera.position.z-Math.tanh((world.camera.position.z-anchor.z)/1000)*1000*parallax);uniforms.uBackdropFog.value.copy(fogDay).lerp(fogNight,world.toon.uniforms.uNight.value);},dispose(){if(closed)return;closed=true;root.removeFromParent();for(const geometry of geometries)geometry.dispose();material.dispose();}};
}
