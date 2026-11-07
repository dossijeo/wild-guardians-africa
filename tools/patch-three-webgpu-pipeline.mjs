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

// compileAsync normally replaces a non-scene root with an internal scene and
// hardcodes renderObject. Shadow compilation must use the actual scene and the
// same shadow callback as a real pass. Only the two bundled WebGPU renderers
// are patched; the extension refuses uninitialized or unsupported lights.
const shadowSceneBefore='\t\tconst sceneRef = ( scene.isScene === true ) ? scene : _scene;\n\n\t\tif ( targetScene === null ) targetScene = scene;';
const shadowSceneAfter='\t\tconst sceneRef = this._wgCompileSceneReference || ( ( scene.isScene === true ) ? scene : _scene );\n\n\t\tif ( targetScene === null ) targetScene = scene;';
const shadowCallbackBefore='\t\tthis._currentRenderContext = renderContext;\n\t\tthis._currentRenderObjectFunction = this.renderObject;\n\n\t\tthis._handleObjectFunction = this._createObjectPipeline;';
const shadowCallbackAfter=shadowCallbackBefore.replace('this._currentRenderObjectFunction = this.renderObject;','this._currentRenderObjectFunction = this._wgCompileRenderObjectFunction || this.renderObject;');
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

export async function patchInstalledThree(root='node_modules/three'){
 const metadata=JSON.parse(await readFile(`${root}/package.json`,'utf8'));
 if(metadata.version!=='0.180.0')throw Error(`Unsupported Three.js version: ${metadata.version}`);
 const paths=['src/renderers/webgpu/utils/WebGPUPipelineUtils.js','src/renderers/common/Pipelines.js','build/three.webgpu.js','build/three.webgpu.nodes.js'].map(p=>`${root}/${p}`);
 const originals=await Promise.all(paths.map(p=>readFile(p,'utf8')));
 const patched=originals.map((source,i)=>i===0?patchPipelineSource(source):i===1?patchPipelineCacheSource(source):patchShadowCompileSource(patchPipelineCacheSource(patchPipelineSource(source)))); // Validate all before writing any.
 for(let i=0;i<paths.length;i++)if(patched[i]!==originals[i])await writeFile(paths[i],patched[i]);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await patchInstalledThree();
