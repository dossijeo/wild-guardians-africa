import {MessageChannel} from 'node:worker_threads';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createNativeResourcePreparationConnection} from '../../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../../src/rendering/native-resource-preparation-receiver.js';
import {nativeResourceAdmissionProfile} from '../../src/world/native-resource-admission-profiles.js';
import {pair,fixture,flush,preparedWorldDraw} from './remote-webgpu-fixture.js';
import {prepareHomeAbsenceDraw} from './native-home-arrival-remote.js';

// One reusable integration vertical. Supply a real native planner and invoke
// its existing operation; tests only vary the request and the relevant facts.
// Real WASM, source publication, resource MessageChannel, client and draw host;
// deterministic fake GPU queue. Hardware/visual acceptance remains separate.
export async function createNativeAdmissionVertical({planner,elapsed,kind,onPrepare=()=>{},onReady=()=>{},onDrain=()=>{},onCommit=()=>{}}){
  let currentKind=kind,profile=nativeResourceAdmissionProfile(kind);
  const [sourcePort,drawPort]=pair();
  const graphics=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',
    nativeTaskStartVersion:1,nativeTaskSettlementVersion:1,nativeTaskConsequenceVersion:1,nativeDeferredResumeVersion:1,nativeTaskActionVersion:1,nativeTaskActionRestoreVersion:1,
    nativeTaskActionClockVersion:1,nativeResumeVersion:1,nativeSuspendedVersion:1,nativeHomeRouteVersion:1,nativeHomeArrivalVersion:1}},
    {intentControl:{port:drawPort,session:'admission-vertical'},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {port1,port2}=new MessageChannel(),errors=[],packets=[];
  let source,connection,endpoint,preparations=0,commits=0,aborts=0,active=false,committedPacket;
  const clock={version:1,epoch:0,elapsed,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:false,
    segments:[{start:elapsed,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-elapsed}]};
  async function close(){
    source?.dispose();connection?.dispose();endpoint?.dispose();port1.close();port2.close();
    graphics.client.dispose();await graphics.host.dispose();
  }
  try{
    source=createNativeIntentControlPublication({port:sourcePort,session:'admission-vertical',observe:planner.observeNativeIntentControl});
    await source.ready;
    const quiesce=source.quiesceGpuForMutation;
    source.quiesceGpuForMutation=async options=>{const receipt=await quiesce(options);await onDrain({receipt,source,...graphics});return receipt;};
    endpoint=attachNativeResourcePreparationEndpoint({port:port2,session:'vertical-resources',isRunning:()=>true,
      onError:error=>errors.push(error),prepare:async(method,resources,options)=>{
        preparations++;
        await onPrepare({method,resources,options,source,...graphics});
        const reference=profile.reference(resources),acting=currentKind==='task-action',consequence=currentKind==='task-consequence',home=currentKind==='home-route',arrival=currentKind==='home-arrival',settlement=currentKind==='task-settlement';
        if(!arrival)graphics.client.registerClockBinding(graphics.buffer,{byteOffset:0,semantic:'relative',epoch:settlement?resources.worldBoundary.effectiveTime:resources.startTime,...(acting||settlement?{}:{resourceEnd:resources.endTime}),
          ...(settlement?{nativeSettlement:reference}:acting?{nativeAction:reference}:consequence?{nativeConsequence:reference}:home?{nativeHome:reference}:currentKind==='task-start'?{nativeStart:reference}:{nativeResume:reference})});
        const templateKey=settlement?'settlementTemplate':acting?'actionTemplate':consequence?'consequenceTemplate':home?'homeTemplate':currentKind==='task-start'?'startTemplate':'resumeTemplate';
        const packet=arrival?await prepareHomeAbsenceDraw({...graphics,clock},resources):await preparedWorldDraw({...graphics,clock,[templateKey]:reference},resources.worldBoundary,0,options.signal);
        packet.presented.catch(()=>{});packets.push(packet);
        // If a test hook fails after preparation, this owner retires the packet.
        try{await onReady({packet,reference,source,...graphics});}catch(error){packet.abort();throw error;}
        return {preparedWorldBoundary:packet.preparedWorldBoundary,[profile.templateField]:reference,
          valid:packet.valid,commit(data){commits++;const result=packet.commit(data.worldBoundary,data[profile.bindingField]);onCommit({data,source,...graphics});committedPacket.resolve(result);return result;},
          abort(){aborts++;packet.abort();}};
      }});
    connection=createNativeResourcePreparationConnection({port:port1,session:'vertical-resources',onError:error=>errors.push(error)});
    await connection.ready;
    const first=graphics.frame(0,{clock});await flush();await graphics.host.idle();graphics.host.present();await first;
    return {...graphics,source,connection,packets,get errors(){return [...errors,...graphics.errors];},get profile(){return profile;},
      counters:()=>({preparations,commits,aborts}),
      async run(invoke,{signal=null,kind:nextKind=currentKind}={}){
        if(active)throw Error('Admission vertical already running');
        profile=nativeResourceAdmissionProfile(nextKind);currentKind=nextKind;active=true;
        const method=currentKind==='task-settlement'?'prepareNativeTaskSettlementResources':currentKind==='task-consequence'?'prepareNativeTaskConsequenceResources':currentKind==='task-action'?'prepareNativeTaskActionResources':currentKind==='home-route'?'prepareNativeHomeRouteResources':currentKind==='home-arrival'?'prepareNativeHomeArrivalResources':currentKind==='task-start'?'prepareNativeTaskStartResources':'prepareNativeResumeResources';
        committedPacket={};committedPacket.promise=new Promise(resolve=>{committedPacket.resolve=resolve;});
        try{return await invoke({getPublication:()=>source,signal,
          prepareResources:({resources,signal,deferredStart})=>connection[method](resources,{signal,deferredStart})});}
        finally{active=false;}
      },
      async present(){
        // The retained-resource commit and direct attestation travel on separate
        // channels. Drain the resource port before requesting adoption in tests.
        await committedPacket.promise;await flush();await graphics.host.idle();
        graphics.host.present();await packets.at(-1)?.presented;
      },
      close
    };
  }catch(error){await close();throw error;}
}
