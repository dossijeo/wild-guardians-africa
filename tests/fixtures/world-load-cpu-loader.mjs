const classes={
 '/src/rendering/biome-ground.js':['BiomeGround'], '/src/rendering/vfx.js':['VfxLibrary'],
 '/src/rendering/work-vfx.js':['WorkVfx'],'/src/rendering/attack-vfx.js':['AttackVfx'],
 '/src/rendering/shield-vfx.js':['ShieldVfx'],'/src/rendering/agriculture-vfx.js':['AgricultureVfx'],
 '/src/rendering/material-vfx.js':['MaterialVfx'],'/src/rendering/locomotion-vfx.js':['LocomotionVfx'],
 '/src/rendering/chunk-stream.js':['NativeChunkStream'],'/src/rendering/hands.js':['NativeHands'],
 '/src/rendering/raid-camera.js':['RaidCameraDirector'],'/src/world/raid-entry-preparer.js':['RaidEntryPreparer']};
export async function load(url,context,next){
 let source;const path=new URL(url).pathname;
 for(const [suffix,names] of Object.entries(classes))if(path.endsWith(suffix))source=names.map(name=>`export class ${name}{constructor(){this.tile={};this.ready=Promise.resolve();}async load(){}whenReady(){return Promise.resolve();}}`).join(String.fromCharCode(10));
 if(path.endsWith('/src/rendering/assets.js'))source='export class Assets{};export const bytes=async()=>new Uint8Array();export const json=(path)=>Promise.resolve(globalThis.__worldLoadCpu.json(path));';
 if(path.endsWith('/src/rendering/crop-batch.js'))source='export const createCropBatch=()=>({dispose(){}});export const createCropBatchAsync=async()=>createCropBatch();';
 if(path.endsWith('/src/rendering/crop-library.js'))source='export const loadCropBridges=async()=>({});';
 if(path.endsWith('/src/rendering/animal-preload.js'))source='export class AnimalPreload{};export const releaseActorRig=()=>{};';
 if(path.endsWith('/src/rendering/african-toon.js'))source='export class AfricanToon{};export const toonDestruction=()=>{},toonDebris=()=>{};export const paintedWaterMaterial=()=>({});';
 if(path.endsWith('/tools/experiments/far-scene-loader.js'))source='export const loadFarSceneData=async(request,options)=>{globalThis.__worldLoadCpu.workers.push({request,signal:options.signal});return {data:{trees:[],ground:null}};};';
 if(path.endsWith('/src/rendering/far-vegetation.js'))source='export const attachBiomeFarVegetation=async(world,options)=>{globalThis.__worldLoadCpu.attach.push(options);if(options.initialRegion)await options.initialRegion.ready;return {};};';
 return source===undefined?next(url,context):{format:'module',source,shortCircuit:true};
}
