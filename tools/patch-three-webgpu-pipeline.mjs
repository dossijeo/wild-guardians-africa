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

export async function patchInstalledThree(root='node_modules/three'){
 const metadata=JSON.parse(await readFile(`${root}/package.json`,'utf8'));
 if(metadata.version!=='0.180.0')throw Error(`Unsupported Three.js version: ${metadata.version}`);
 const paths=['src/renderers/webgpu/utils/WebGPUPipelineUtils.js','src/renderers/common/Pipelines.js','build/three.webgpu.js','build/three.webgpu.nodes.js'].map(p=>`${root}/${p}`);
 const originals=await Promise.all(paths.map(p=>readFile(p,'utf8')));
 const patched=originals.map((source,i)=>i===0?patchPipelineSource(source):i===1?patchPipelineCacheSource(source):patchPipelineCacheSource(patchPipelineSource(source))); // Validate all before writing any.
 for(let i=0;i<paths.length;i++)if(patched[i]!==originals[i])await writeFile(paths[i],patched[i]);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await patchInstalledThree();
