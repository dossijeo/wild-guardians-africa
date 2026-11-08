import {patchStableMaterialKeys} from './patch-three-stable-material-keys.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Three r180 fails to forward createRenderPipelineAsync rejection to the
// promise awaited by compileAsync. Keep this narrow patch reproducible on npm
// install, and fail closed if the dependency no longer has the expected code.
const before=`const p = new Promise( ( resolve /*, reject*/ ) => {

				device.createRenderPipelineAsync( pipelineDescriptor ).then( pipeline => {

					pipelineData.pipeline = pipeline;
					resolve();

				} );`;
const after=`const p = new Promise( ( resolve, reject ) => {

				device.createRenderPipelineAsync( pipelineDescriptor ).then( pipeline => {

					pipelineData.pipeline = pipeline;
					resolve();

				}, reject );`;
const pendingBefore='\t\t\t} );\n\n\t\t\tpromises.push( p );\n\n\t\t}\n\n\t}\n\n\t/**\n\t * Creates GPU render bundle encoder';
const pendingAfter=pendingBefore.replace('\t\t\tpromises.push( p );','\t\t\tpipelineData.pendingPromise = p;\n\t\t\tpromises.push( p );');
const cachedBefore='\t\treturn data.pipeline;\n\n\t}\n\n\t/**\n\t * Deletes the pipeline for the given render object.';
const cachedAfter='\t\tif ( promises !== null && data.pipeline !== undefined ) {\n\n\t\t\tconst pending = backend.get( data.pipeline ).pendingPromise;\n\t\t\tif ( pending !== undefined && ! promises.includes( pending ) ) promises.push( pending );\n\n\t\t}\n\n'+cachedBefore;

// A generated node id in this reference becomes part of the WGSL source.
// Keep its symbol stable across otherwise identical meshes while retaining
// Three's per-object reference and binding updates.
const morphBefore="reference( 'morphTargetInfluences', 'float' ).element( i )";
const morphAfter="reference( 'morphTargetInfluences', 'float' ).setName( 'wgMorphInfluences' ).element( i )";

// compileAsync normally replaces a non-scene root with an internal scene and
// hardcodes renderObject. Shadow compilation must use the actual scene and the
// same shadow callback as a real pass. Only the two bundled WebGPU renderers
// are patched; the extension refuses uninitialized or unsupported lights.
const shadowSceneBefore='\t\tconst sceneRef = ( scene.isScene === true ) ? scene : _scene;\n\n\t\tif ( targetScene === null ) targetScene = scene;';
const shadowSceneAfter='\t\tconst sceneRef = this._wgCompileSceneReference || ( ( scene.isScene === true ) ? scene : _scene );\n\n\t\tif ( targetScene === null ) targetScene = scene;';
const shadowCallbackBefore='\t\tthis._currentRenderContext = renderContext;\n\t\tthis._currentRenderObjectFunction = this.renderObject;\n\n\t\tthis._handleObjectFunction = this._createObjectPipeline;';
const shadowCallbackAfter=shadowCallbackBefore.replace('this._currentRenderObjectFunction = this.renderObject;','this._currentRenderObjectFunction = this._wgCompileRenderObjectFunction || this.renderObject;');
// The same shadow override material and render object survive material swaps.
// Three only rechecks its cache key after a version change, so changing the
// selected position graph must invalidate that object's shadow variant.
const shadowPositionBefore='\t\t\tmaterial = overrideMaterial;';
const shadowPositionRestoreBefore='\t\t\t\t\toverridePositionNode = overrideMaterial.positionNode;\n\t\t\t\t\toverrideMaterial.positionNode = material.castShadowPositionNode;';
const shadowPositionRestoreAfter=shadowPositionRestoreBefore.replace('overridePositionNode = overrideMaterial.positionNode;','if ( overridePositionNode === undefined ) overridePositionNode = overrideMaterial.positionNode;');
const shadowPositionAfter=`\t\t\tif ( overrideMaterial.isShadowPassMaterial === true ) {

\t\t\t\tconst all = this._wgShadowPositionKeys || ( this._wgShadowPositionKeys = new WeakMap() );
\t\t\t\tlet byMaterial = all.get( object );
\t\t\t\tif ( byMaterial === undefined ) { byMaterial = new WeakMap(); all.set( object, byMaterial ); }
\t\t\t\tconst position = overrideMaterial.positionNode || null;
\t\t\t\tconst version = material === overrideMaterial ? null : material.version;
\t\t\t\tconst previous = byMaterial.get( overrideMaterial );
\t\t\t\tif ( previous === undefined || previous.position !== position || previous.material !== material || previous.version !== version ) {
\t\t\t\t\tbyMaterial.set( overrideMaterial, { position, material, version } );
\t\t\t\t\toverrideMaterial.needsUpdate = true;
\t\t\t\t}

\t\t\t}

`+shadowPositionBefore;
const shadowMethodBefore='\tasync compileAsync( scene, camera, targetScene = null ) {';
const shadowMethodAfter=`\tcompileShadowAsync( object, scene, camera, light ) {

\t\tif ( this._initialized === false || this._isDeviceLost === true || ! light.isDirectionalLight || ! light.shadow.map ) throw new Error( 'Shadow compilation unavailable' );

\t\tconst shadow = light.shadow, target = shadow.map;
\t\tconst state = resetRendererAndSceneState( this, scene, {} );
\t\tconst oldLayer = shadow.camera.layers.mask;
\t\tconst previousScene = this._wgCompileSceneReference, previousCallback = this._wgCompileRenderObjectFunction;
\t\tlet pending;
\t\ttry {

\t\t\tif ( ( oldLayer & 0xFFFFFFFE ) === 0 ) shadow.camera.layers.mask = camera.layers.mask;
\t\t\tshadow.updateMatrices( light );
\t\t\ttarget.setSize( shadow.mapSize.width, shadow.mapSize.height, target.depth );
\t\t\tscene.overrideMaterial = getShadowMaterial( light );
\t\t\tthis.setRenderTarget( target );
\t\t\tthis._wgCompileSceneReference = scene;
\t\t\tthis._wgCompileRenderObjectFunction = getShadowRenderObjectFunction( this, shadow, this.shadowMap.type, state.mrt ? state.mrt.has( 'velocity' ) : false );
\t\t\tpending = this.compileAsync( object, shadow.camera, scene );

\t\t} finally {

\t\t\tthis._wgCompileSceneReference = previousScene;
\t\t\tthis._wgCompileRenderObjectFunction = previousCallback;
\t\t\tshadow.camera.layers.mask = oldLayer;
\t\t\trestoreRendererAndSceneState( this, scene, state );

\t\t}
\t\treturn pending;

\t}

`+shadowMethodBefore;

function replaceOnce(source,before,after,label){
 const count=(text,needle)=>text.split(needle).length-1;
 if(count(source,after)===1)return source;
 if(count(source,before)!==1)throw Error(`Unexpected Three.js ${label} implementation`);
 return source.replace(before,after);
}

export function patchPipelineSource(source){
 return replaceOnce(replaceOnce(source,before,after,'pipeline'),pendingBefore,pendingAfter,'pending pipeline');
}
export function patchPipelineCacheSource(source){return replaceOnce(source,cachedBefore,cachedAfter,'pipeline cache');}
export function patchShadowCompileSource(source){return replaceOnce(replaceOnce(replaceOnce(source,shadowSceneBefore,shadowSceneAfter,'shadow scene'),shadowCallbackBefore,shadowCallbackAfter,'shadow callback'),shadowMethodBefore,shadowMethodAfter,'shadow method');}
export function patchShadowPositionSource(source){return replaceOnce(replaceOnce(source,shadowPositionRestoreBefore,shadowPositionRestoreAfter,'shadow position restoration'),shadowPositionBefore,shadowPositionAfter,'shadow position');}
export function patchMorphInfluenceSource(source){return replaceOnce(source,morphBefore,morphAfter,'morph influence');}
export function restoreMorphInfluenceSource(source){return replaceOnce(source,morphAfter,morphBefore,'morph influence restoration');}

export async function patchInstalledThree(root='node_modules/three',{stableMorph=process.env.WG_THREE_STABLE_MORPH!=='0'}={}){
 if(typeof stableMorph!=='boolean')throw TypeError('Invalid stable morph setting');
 const metadata=JSON.parse(await readFile(`${root}/package.json`,'utf8'));
 if(metadata.version!=='0.180.0')throw Error(`Unsupported Three.js version: ${metadata.version}`);
 const paths=['src/renderers/webgpu/utils/WebGPUPipelineUtils.js','src/renderers/common/Pipelines.js','build/three.webgpu.js','build/three.webgpu.nodes.js','src/nodes/accessors/MorphNode.js','src/renderers/common/Renderer.js','src/renderers/common/RenderObject.js'].map(p=>`${root}/${p}`);
 const originals=await Promise.all(paths.map(p=>readFile(p,'utf8')));
 const morph=stableMorph?patchMorphInfluenceSource:restoreMorphInfluenceSource;
 const patched=originals.map((source,i)=>i===0?patchPipelineSource(source):i===1?patchPipelineCacheSource(source):i===4?morph(source):i===5?patchShadowPositionSource(source):i===6?patchStableMaterialKeys(source):patchStableMaterialKeys(morph(patchShadowPositionSource(patchShadowCompileSource(patchPipelineCacheSource(patchPipelineSource(source))))))); // Validate all before writing any.
 for(let i=0;i<paths.length;i++)if(patched[i]!==originals[i])await writeFile(paths[i],patched[i]);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await patchInstalledThree();
