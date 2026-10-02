import {nativeGateLeaves} from '../world/gate-frames-native.js';
import {gateLeafFootprint,gateSwingPolygon,gateTriggerRadius,routeHitsGateArea} from '../world/gate-passages.js';
import {footprintDistance} from '../world/footprints.js';
// Integration timing: the source lab supplies geometry, not an opening clock.
export const GATE_MOVE_SECONDS=.6;
const nearby=(worker,gate)=>worker.status!=='home'&&Math.hypot(worker.x-gate.x,worker.z-gate.z)<=gateTriggerRadius(gate);
export function waitForGate(worker,gates=[]){
  if(worker.gateWaiting)worker.gateWaiting=false;
  if(!worker.path?.length)return false;
  for(const gate of gates){
    if(!gate.gate||!nativeGateLeaves[gate.material]||gate.status==='ruined'||!nearby(worker,gate))continue;
    const ahead=Math.max(4,gateTriggerRadius(gate)+1),crossing=routeHitsGateArea(worker,gateLeafFootprint(gate),ahead),opening=gate.gateOpen??0;
    if(crossing&&(gate.status!=='intact'||opening<1)||opening>0&&opening<1&&routeHitsGateArea(worker,gateSwingPolygon(gate),ahead)){worker.gateWaiting=true;worker.running=false;return true;}
  }
  return false;
}
export function advanceGateLeaves(state,seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new Error('Paso de puerta inválido');
  if(!seconds||state.pauses?.length||state.result||state.initialPreparation)return;
  for(const worker of state.workers)if(worker.gateWaiting)worker.gateWaiting=false;
  for(const gate of state.structures){
    if(!gate.gate||!nativeGateLeaves[gate.material])continue;
    if(gate.status==='ruined'){gate.gateOpen=0;continue;}
    if(gate.status!=='intact')continue;
    const area=gateSwingPolygon(gate),workers=state.workers.filter(w=>nearby(w,gate));
    const occupied=workers.some(w=>footprintDistance(area,w.x,w.z)<(w.radius??.28));
    const requested=workers.some(w=>routeHitsGateArea(w,gateLeafFootprint(gate),gateTriggerRadius(gate)+1));
    // Legacy saves may already have a worker inside a formerly invisible gate.
    const before=gate.gateOpen??(occupied?1:0);
    gate.gateOpen=requested||occupied?Math.min(1,before+seconds/GATE_MOVE_SECONDS):Math.max(0,before-seconds/GATE_MOVE_SECONDS);
    if(gate.gateOpen>1-1e-9)gate.gateOpen=1;if(gate.gateOpen<1e-9)gate.gateOpen=0;
  }
}
