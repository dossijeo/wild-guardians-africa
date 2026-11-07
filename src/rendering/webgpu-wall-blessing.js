import {abs,float,materialReference,max,mix,output,positionLocal,pow,sin,smoothstep,step,texture,varying,vec2,vec3,vec4} from 'three/tsl';

// One node graph per world texture and simulation clock. NativeWall already
// binds the current blessing and local bounds on each stage's material.
const graphs=new WeakMap();
export function configureWebGpuWallBlessing(material,{vine,clock}={}){
 if(!material?.isNodeMaterial||!vine?.isTexture||!clock?.isNode||material.outputNode!==null)throw TypeError('Invalid wall blessing material');
 let byClock=graphs.get(vine);if(!byClock){byClock=new WeakMap();graphs.set(vine,byClock);}let graph=byClock.get(clock);if(!graph){const info=materialReference('userData.blessingObject.value','vec4'),bounds=materialReference('userData.blessingWallBounds.value','vec4'),local=varying(positionLocal),uv=local.xy.sub(bounds.xy).div(bounds.zw),value=texture(vine,uv).r,pillar=step(.36,abs(uv.x.sub(.5))),band=smoothstep(.003,.012,abs(uv.y.sub(.79))).oneMinus().mul(pillar),rune=max(value,band),active=info.x.mul(step(info.y,clock)),burst=smoothstep(0,2.8,clock.sub(info.y).max(0)).oneMinus(),pulse=pow(max(sin(clock.mul(.65)),0),12),wound=smoothstep(0,.45,clock.sub(info.z).max(0)).oneMinus(),shade=smoothstep(.1,.8,rune).mul(.45).mul(active),light=vec3(.015,1.2,.8).mul(pow(rune,1.7)).mul(pulse.mul(.12).add(burst.mul(.6)).add(1)).add(vec3(.01,.18,.11).mul(pow(rune,.4))).add(vec3(.42,.10,.025).mul(wound)).mul(active);graph=vec4(output.rgb.mul(float(1).sub(shade)).add(light),output.a);byClock.set(clock,graph);}material.outputNode=graph;return material;
}
