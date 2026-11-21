import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const b=JSON.parse(fs.readFileSync('.cache/native-next-task-baseline.json')),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),roster='src/rendering/webgpu-worker-roster.js',surface='src/rendering/webgpu-world-surface.js';for(const p of [roster,surface])assert.equal(hash(p),b.ownedBefore[p],p);
let code=fs.readFileSync(roster,'utf8').replaceAll(String.fromCharCode(13),''),start=code.indexOf(' async function prepareNativeMotionProposal('),end=code.indexOf('\n function sameNativeReference',start);assert(start>0&&end>start);let section=code.slice(start,end);
const old="pending.stage='preparing';pending.cancel=cancel;return {request:{object:actor.root,options},valid,validateCommit,";assert.equal(section.split(old).length,2);section=section.replace(old,"pending.stage='preparing';pending.cancel=cancel;const part={request:{object:actor.root,options},valid,validateCommit,");
const tail='},cancel};\n  }catch(error)';assert.equal(section.split(tail).length,2);section=section.replace(tail,`},cancel};
   // Three raycasting reads the live scene. Keep the already submitted Idle
   // presentation available while this same actor stages its next Task packet.
   if(starting&&previous?.nativeSettlementBinding){let pickingSource=false;
    part.withSourcePresentation=operation=>{
     if(typeof operation!=='function'||pickingSource||!valid())throw Error('Native source presentation unavailable');
     const restoreCandidate=activated;pickingSource=true;
     try{if(restoreCandidate)part.rollback();const result=operation();if(result&&typeof result.then==='function')throw Error('Native source presentation must be synchronous');return result;}
     finally{try{if(restoreCandidate&&!activated)part.activate();}finally{pickingSource=false;}}
    };
   }
   return part;
  }catch(error)`);code=code.slice(0,start)+section+code.slice(end);
let world=fs.readFileSync(surface,'utf8').replaceAll(String.fromCharCode(13),'');const marker='    async function prepareFrame(){';assert.equal(world.split(marker).length,2);world=world.replace(marker,`    if(starting&&participants.length===1&&participants[0].withSourcePresentation)item.withSourcePresentation=operation=>{
     if(!current())throw Error('Native source presentation unavailable');return participants[0].withSourcePresentation(operation);
    };
${marker}`);
const pick='pick:picker?.pick??null,';assert.equal(world.split(pick).length,2);world=world.replace(pick,"pick:picker?options=>{const pending=nativeGateProposal;return pending&&['preparing','ready'].includes(pending.descriptor.phase)&&pending.withSourcePresentation?pending.withSourcePresentation(()=>picker.pick(options)):picker.pick(options);}:null,");
fs.writeFileSync(roster,code);fs.writeFileSync(surface,world);console.log(JSON.stringify({changed:[roster,surface],scope:'Synchronous retained-source picking only for a genuine settled actor staging next Task, through existing reversible participant; no new clocks, bodies, permissions, scene or GPU work.'}));
