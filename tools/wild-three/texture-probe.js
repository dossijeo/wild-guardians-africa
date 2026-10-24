import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {assetUrl} from '/src/rendering/asset-url.js';
import {NativeSky} from '/src/rendering/sky.js';
const deferredMips=new URLSearchParams(location.search).get('deferredMips')==='1';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#world'),antialias:false});
renderer.setSize(1280,720);const gl=renderer.getContext();
const nextFrame=()=>new Promise(requestAnimationFrame);
const clone=source=>{const target=source.clone();target.source=new THREE.Source(source.image);target.needsUpdate=true;return target;};
function readMips(texture){
 const framebuffer=gl.createFramebuffer(),out=[];try{gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
 const levels=texture.generateMipmaps?1+Math.floor(Math.log2(Math.max(texture.image.width,texture.image.height))):1;
 for(let level=0;level<levels;level++){const width=Math.max(1,texture.image.width>>level),height=Math.max(1,texture.image.height>>level),pixels=new Uint8Array(width*height*4);
 gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,renderer.properties.get(texture).__webglTexture,level);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete mip '+level);
 gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);out.push(pixels);}
 }finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(framebuffer);renderer.resetState();}return out;
}
function compare(reference,actual){return actual.map((pixels,level)=>{const a=reference[level];let changed=0,max=0,total=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-pixels[i]);if(d)changed++;max=Math.max(max,d);total+=d;}return {level,bytes:a.length,changed,max,mean:total/a.length};});}
window.runTextureProbe=async()=>{
 const runtime=new URLSearchParams(location.search).get('runtime')==='1',sources=[],seen=new Set(),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const models=[['lion','5ac817bcc5a8147c69f0e9876d2e37a94228272b14b85be1d1ecbfd6e2d0527b'],...(runtime?[['rhino','b396fba7b2c500770a3770222fc6a3b5b9a17fce66933ad53d569ae349affc82'],['hyena','7de8ad72063cfeeb74f5d334069b77a3ac5c06c39a6c674a75b21ff51a210c25']]:[])];
 for(const [name,hash]of models){const sourceUrl='/assets/'+hash+'.glb',url=runtime?assetUrl(sourceUrl):sourceUrl,gltf=await loader.loadAsync(url);
 gltf.scene.traverse(object=>{for(const m of [object.material].flat().filter(Boolean))for(const slot of ['map','normalMap','roughnessMap'])if(m[slot]&&!seen.has(m[slot])){seen.add(m[slot]);sources.push({name:name+':'+slot,url,texture:m[slot]});}});}
 const sky=runtime?new NativeSky():null;if(sky){await sky.load();sky.textures.forEach((texture,i)=>sources.push({name:'sky:panorama:'+i,texture}));sky.environmentTextures.forEach((texture,i)=>sources.push({name:'sky:environment:'+i,texture}));}
 const pixels=new Uint8ClampedArray(128*128*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=i*17%256;pixels[i+1]=37;pixels[i+2]=213;pixels[i+3]=i/4%256;}
 const alpha=await createImageBitmap(new ImageData(pixels,128,128),{premultiplyAlpha:'none',colorSpaceConversion:'none'}),alphaTexture=new THREE.Texture(alpha);alphaTexture.colorSpace=THREE.SRGBColorSpace;alphaTexture.flipY=false;
 sources.push({name:'synthetic-alpha',texture:alphaTexture});const rows=[];
 try{for(const {name,url,texture}of sources){let reference=null;const trials=[];
 for(const mode of ['full','regions','full','regions']){const target=clone(texture),source=clone(texture),calls=[],units=[],before=renderer.info.memory.textures;
 const methods=['getParameter','texStorage2D','texSubImage2D','generateMipmap'],originals=methods.map(n=>gl[n]);
 for(const [i,n]of methods.entries())gl[n]=function(...args){const start=performance.now();try{return originals[i].apply(this,args);}finally{calls.push({name:n,parameter:n==='getParameter'?args[0]:null,ms:performance.now()-start});}};
 const began=performance.now();let preparationMs,error=null,actual;
 try{if(mode==='full'){const t=performance.now();renderer.initTexture(target);units.push(performance.now()-t);}else{
 target.source.dataReady=false;const t=performance.now();try{renderer.initTexture(target);}finally{target.source.dataReady=true;}units.push(performance.now()-t);
 for(let y=0;y<texture.image.height;y+=64){const region=new THREE.Box2(new THREE.Vector2(0,y),new THREE.Vector2(texture.image.width,Math.min(y+64,texture.image.height))),position=new THREE.Vector2(0,y),t=performance.now();renderer.copyTextureToTexture(source,target,region,position,0,0,{generateMipmaps:!deferredMips||y+64>=texture.image.height});units.push(performance.now()-t);await nextFrame();}}
 preparationMs=performance.now()-began;
 }catch(e){error=String(e);}finally{for(const [i,n]of methods.entries())gl[n]=originals[i];}
 try{actual=readMips(target);reference??=actual;const code=gl.getError();trials.push({mode,preparationMs,error,units,calls,differences:compare(reference,actual),glError:code});}finally{target.dispose();source.dispose();if(trials.length)trials.at(-1).textureCountDelta=renderer.info.memory.textures-before;}
 await nextFrame();}
 rows.push({name,url,dataTexture:!!texture.isDataTexture,width:texture.image.width,height:texture.image.height,colorSpace:texture.colorSpace,imageType:texture.image.constructor.name,trials});}
 }finally{alpha.close();sky?.dispose();for(const {texture}of sources)texture.dispose();}
 const ext=gl.getExtension('WEBGL_debug_renderer_info');return {runtime,deferredMips,revision:THREE.REVISION,hardware:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,scope:'Public API feasibility on model/sky resources plus alpha adversary; runtime flag selects shipped aliases instead of source GLBs. Explicit RAF per region and mip readbacks; NOT game throughput or GPU-time benchmark. No canvas pixel conversion.',rows};
};
