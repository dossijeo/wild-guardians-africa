import * as THREE from 'three';
import { Guardian3D } from './guardian-3d.js';

let actor, closed = false, diagnostics = false;
self.onmessage = async ({ data }) => {
 try {
  if (data.type === 'init') {
   diagnostics = data.diagnostics === true; actor = new Guardian3D(data.canvas, { viewport: data.viewport });
   await actor.ready;
   if (!closed) self.postMessage({ type: 'ready' });
  } else if (data.type === 'record') {
   actor?.setRecord(data.record);
  } else if (data.type === 'frame') {
   if (!actor || closed) return;
   if (data.viewport) actor.resize(data.viewport);
   actor.manual = data.manual;
   actor.pointTarget = data.pointTarget ? new THREE.Vector3().fromArray(data.pointTarget) : null;
   actor.draw(data.frame);
   let detail;
   if (diagnostics) { const weights = {}; for (const mesh of actor.face?.meshes ?? []) for (const [key, index] of Object.entries(mesh.morphTargetDictionary)) if (key.startsWith('viseme_') || key.startsWith('blink_')) weights[key] = Math.max(weights[key] ?? 0, mesh.morphTargetInfluences[index]); detail = { cue: actor.face?.data?.id ?? null, weights }; }
   self.postMessage({ type: 'frame', sequence: data.sequence, metrics: actor.metrics, faceError: actor.face?.error?.message ?? null, ...(diagnostics ? { diagnostics: detail } : {}) });
  } else if (data.type === 'dispose') {
   closed = true; actor?.dispose(); self.close();
  }
 } catch (error) { self.postMessage({ type: 'error', message: String(error?.stack ?? error) }); }
};
