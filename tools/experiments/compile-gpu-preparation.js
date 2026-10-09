import {waitGpuPreparation} from './wait-gpu-preparation.js';

// Candidate for Three r180's normal target/output recipe. Own the readiness
// polling rather than leaving compileAsync's internal timer alive on abort.
// compile() still submits synchronously; this does not interrupt driver work.
export async function compileGpuPreparation(renderer,root,camera,scene,{check,signal,pollIntervalMs=10,selectPrograms,onProgress,now=()=>performance.now()}={}) {
 if(typeof check!=='function')throw Error('GPU compilation requires a lifetime check');
 if(selectPrograms!==undefined&&typeof selectPrograms!=='function')throw Error('Invalid GPU program selector');
 if(!Number.isFinite(pollIntervalMs)||pollIntervalMs<=0)throw Error('Invalid GPU compilation polling interval');
 const observe=typeof onProgress==='function'?event=>{try{onProgress({...event,at:now()});}catch{}}:null;
 const associations=observe?[]:null;let associationCount=0;
 const association=observe?(material,program,properties)=>{try{associationCount++;if(associations.length<32)associations.push({programId:Number.isFinite(program.id)?program.id:null,programName:typeof program.name==='string'?program.name.slice(0,160):null,cacheKey:typeof program.cacheKey==='string'?program.cacheKey.slice(0,2048):null,cacheKeyTruncated:typeof program.cacheKey==='string'&&program.cacheKey.length>2048,materialId:Number.isFinite(material.id)?material.id:null,materialUuid:typeof material.uuid==='string'?material.uuid.slice(0,160):null,materialType:typeof material.type==='string'?material.type.slice(0,80):null,materialName:typeof material.name==='string'?material.name.slice(0,160):null,current:properties.currentProgram===program,side:Number.isFinite(material.side)?material.side:null});}catch{}}:null;
 const guard=()=>{check();if(signal?.aborted)throw signal.reason??new DOMException('GPU compilation cancelled','AbortError');};
 const programs=new Set();let timer,polls=0,outcome='resolved';
 const pending=observe?()=>{const ids=[];for(const program of programs){if(ids.length===32)break;try{ids.push(Number.isFinite(program.id)?program.id:null);}catch{ids.push(null);}}return {pendingCount:programs.size,pendingIds:ids,pendingIdsOmitted:Math.max(0,programs.size-ids.length)};}:null;
 try{
 guard();
 const materials=renderer.compile(root,camera,scene);guard();
 // Capture selected programs before borrowed materials can be restored or
 // disposed. This matches compileAsync's currentProgram choice, not unrelated
 // variants previously compiled for the same material. A caller may explicitly
 // select all borrowed variants; selection is snapshotted before any await.
 for(const material of materials){
  guard();const properties=renderer.properties.get(material);
  const selected=selectPrograms?selectPrograms(properties,material):[properties.currentProgram];
  if(!selected||typeof selected[Symbol.iterator]!=='function')throw Error('GPU compilation has no selected readiness program');
  let count=0;
  for(const program of selected){guard();if(typeof program?.isReady!=='function')throw Error('GPU compilation has no selected readiness program');programs.add(program);count++;association?.(material,program,properties);}
  if(count===0)throw Error('GPU compilation has no selected readiness program');
 }
 const selectedCount=observe?programs.size:null;
 observe?.({event:'selected',selectedCount,associationCount,associationOmitted:Math.max(0,associationCount-associations.length),associations});
 let resolveReady;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const poll=()=>{
  guard();
  for(const program of programs){guard();if(program.isReady())programs.delete(program);}
  guard();if(programs.size===0)resolveReady();
  if(observe){polls++;observe({event:'poll',polls,...pending()});}
 };
  poll();
  await waitGpuPreparation(ready,{
   check:guard,signal,
   nextFrame:()=>new Promise((resolve,reject)=>{
    timer=setTimeout(()=>{timer=undefined;try{poll();resolve();}catch(error){reject(error);}},pollIntervalMs);
   })
  });
 }catch(error){outcome='rejected';throw error;}finally{clearTimeout(timer);if(observe)observe({event:'finished',outcome,polls,...pending()});programs.clear();}
}
