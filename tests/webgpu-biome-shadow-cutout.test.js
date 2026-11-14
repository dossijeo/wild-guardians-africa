import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,InstancedBufferAttribute,Mesh,PerspectiveCamera,Scene,Texture} from 'three';
import {MeshBasicNodeMaterial,MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {vec3,vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {getShadowMaterial} from '../node_modules/three/src/nodes/lighting/ShadowFilterNode.js';
import {biomeShadowCutout} from '../src/rendering/webgpu-biome-shadow-cutout.js';
import {chunkClipMask,chunkClipOpacity} from '../src/rendering/webgpu-chunk-clip.js';

test('one shadow graph per UV channel binds the original object map and opacity',()=>{
 const a=new Texture(),b=new Texture(),near=new Texture();near.channel=1;
 const graph=biomeShadowCutout(a),next=biomeShadowCutout(b),nearGraph=biomeShadowCutout(near);
 assert.equal(graph,next);assert.notEqual(graph,nearGraph);assert.throws(()=>biomeShadowCutout({}));
 for(const [map,opacity] of [[a,.4],[b,.8]]){
  const object={material:{map,opacity}},frame=new NodeFrame();frame.object=object;frame.updateNode(graph.colorMap);frame.updateNode(graph.opacity);
  assert.equal(graph.colorMap.node.value,map);assert.equal(graph.opacity.node.value,opacity);
  assert.equal(graph.colorMap.node.getDefaultUV()._attributeName,'uv');
 }
 nearGraph.colorMap.updateReference({object:{material:{map:near}}});nearGraph.colorMap.updateValue();
 assert.equal(nearGraph.colorMap.node.getDefaultUV()._attributeName,'uv1');
 // TextureNode updates the matrix uniform when the reference changes.
 const firstUv=graph.colorMap.node.getDefaultUV();graph.colorMap.node.getTransformedUV(firstUv);
 graph.colorMap.updateReference({object:{material:{map:a}}});graph.colorMap.updateValue();graph.colorMap.node.update();
 assert.equal(graph.colorMap.node._matrixUniform.value,a.matrix);
 graph.colorMap.updateReference({object:{material:{map:b}}});graph.colorMap.updateValue();graph.colorMap.node.update();
 assert.equal(graph.colorMap.node._matrixUniform.value,b.matrix);
});

test('Three shadow override uses the shared cutout graph and original deformation',()=>{
 const map=new Texture(),original=new MeshStandardNodeMaterial({map,opacity:.8,alphaTest:.35});
 const graph=biomeShadowCutout(map);original.castShadowNode=graph.node;original.positionNode=vec3(1,2,3);
 const mesh=new Mesh(new BoxGeometry(),original),scene=new Scene(),shadow=getShadowMaterial({});scene.overrideMaterial=shadow;
 let observed=false;
 const renderer={_handleObjectFunction(object,material){
  observed=true;assert.equal(object,mesh);assert.equal(material,shadow);assert.equal(material.colorNode,graph.node);
  assert.equal(material.positionNode,original.positionNode);assert.equal(material.alphaTest,original.alphaTest);
  graph.colorMap.updateReference({object});graph.colorMap.updateValue();graph.opacity.updateReference({object});graph.opacity.updateValue();
  assert.equal(graph.colorMap.node.value,map);assert.equal(graph.opacity.node.value,.8);
 }};
 Renderer.prototype.renderObject.call(renderer,mesh,scene,{},mesh.geometry,original,null,null);
 assert.ok(observed);assert.notEqual(shadow.colorNode,graph.node);assert.notEqual(shadow.positionNode,original.positionNode);
 original.dispose();mesh.geometry.dispose();
});

test('clipped biome shadow keeps original alpha and chunk mask in the override',()=>{
 const map=new Texture(),original=new MeshStandardNodeMaterial({map,opacity:.8,alphaTest:.35}),graph=biomeShadowCutout(map,{clip:true});original.opacityNode=chunkClipOpacity;original.castShadowNode=graph.node;original.positionNode=vec3(1,2,3);const geometry=new BoxGeometry();geometry.setAttribute('wgChunkClip',new InstancedBufferAttribute(new Float32Array([-24,-24,24,24]),4));const mesh=new Mesh(geometry,original),scene=new Scene(),shadow=new MeshBasicNodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let observed=false;
 try{const renderer={_handleObjectFunction(object,material){observed=true;assert.equal(material.colorNode,graph.node);assert.equal(material.positionNode,original.positionNode);assert.equal(material.alphaTest,.35);let hasMask=false;material.colorNode.traverse(node=>{if(node===chunkClipMask)hasMask=true;});assert.equal(hasMask,true);const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},gpu=new WebGPURenderer({canvas});gpu.hasFeature=()=>true;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.material=material;builder.scene=scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgChunkClip/);assert.match(builder.fragmentShader,/discard/);assert.match(builder.fragmentShader,/step\(/);assert.match(builder.fragmentShader,/textureSample/);}};Renderer.prototype.renderObject.call(renderer,mesh,scene,{},geometry,original,null,null);assert.equal(observed,true);}finally{original.dispose();shadow.dispose();geometry.dispose();map.dispose();}
});
