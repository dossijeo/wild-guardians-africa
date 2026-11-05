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

export function patchPipelineSource(source){
 const occurrences=(text,needle)=>text.split(needle).length-1;
 if(occurrences(source,after)===1&&occurrences(source,before)===0)return source;
 if(occurrences(source,before)!==1||occurrences(source,after)!==0)throw Error('Unexpected Three.js pipeline implementation');
 return source.replace(before,after);
}

export async function patchInstalledThree(root='node_modules/three'){
 const metadata=JSON.parse(await readFile(`${root}/package.json`,'utf8'));
 if(metadata.version!=='0.180.0')throw Error(`Unsupported Three.js version: ${metadata.version}`);
 const paths=['src/renderers/webgpu/utils/WebGPUPipelineUtils.js','build/three.webgpu.js','build/three.webgpu.nodes.js'].map(p=>`${root}/${p}`);
 const originals=await Promise.all(paths.map(p=>readFile(p,'utf8')));
 const patched=originals.map(patchPipelineSource); // Validate all before writing any.
 for(let i=0;i<paths.length;i++)if(patched[i]!==originals[i])await writeFile(paths[i],patched[i]);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await patchInstalledThree();
