import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export async function cropStageHeightManifest(){
 const catalogue=JSON.parse(await readFile('public/content/models.json','utf8'));
 const source=catalogue.find(item=>item.source?.includes('Cultivos'))?.url;
 if(!/^\/assets\/[a-f0-9]{64}\.glb$/.test(source??''))throw Error('Unexpected crop source');
 const file=await readFile('public'+source),digest=createHash('sha256').update(file).digest('hex');
 if(digest!==source.slice(8,-4)||file.readUInt32LE(0)!==0x46546c67||file.readUInt32LE(4)!==2)throw Error('Crop source hash or format mismatch');
 const bytes=file.readUInt32LE(12);if(file.readUInt32LE(16)!==0x4e4f534a||20+bytes>file.length)throw Error('Invalid crop GLB JSON');
 const gltf=JSON.parse(file.subarray(20,20+bytes)),species=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'],heights=Object.fromEntries(species.map(id=>[id,Array(5).fill(null)]));
 for(const node of gltf.nodes??[]){const item=node.extras;if(!item||!Number.isInteger(item.cropIndex)||!Number.isInteger(item.stage)||item.cropIndex<0||item.cropIndex>=species.length||item.stage<1||item.stage>5||item.crop!==species[item.cropIndex]||!Number.isFinite(item.height)||item.height<=0||heights[item.crop][item.stage-1]!==null)throw Error('Invalid authored crop stage');heights[item.crop][item.stage-1]=item.height;}
 if(Object.values(heights).some(stages=>stages.some(value=>value===null)))throw Error('Missing crop stage');
 return {version:1,source,sourceSha256:digest,heights};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const data=await cropStageHeightManifest(),path=process.argv[2];if(!path)throw Error('Output path required');await writeFile(path,JSON.stringify(data,null,2)+'\n');}
