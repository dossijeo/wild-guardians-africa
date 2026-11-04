import * as THREE from 'three';

// Latest visual state wins. Narration and input remain on the main thread;
// the OffscreenCanvas and every WebGL resource belong to this Worker.
export class Guardian3DWorkerClient {
 constructor(canvas, { createWorker = () => new Worker(new URL('./guardian-3d-worker.js', import.meta.url), { type: 'module' }), onFailure = () => {}, diagnostics = false } = {}) {
  this.canvas = canvas; this.onFailure = onFailure; this.closed = false; this.inflight = false; this.pending = null; this.sequence = 0; this.manual = {}; this.face = { error: null }; this.metrics = {};
  this.camera = new THREE.OrthographicCamera(-.56,.56,.56,-.56,.01,10); this.camera.position.set(0,0,2); this.camera.lookAt(0,0,0);
  this.ready = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
  this.timer = setTimeout(() => this.fail(Error('Guardian Worker startup timeout')), 15000);
  try { this.worker = createWorker(); this.worker.onmessage = ({ data }) => this.receive(data); this.worker.onerror = event => { event.preventDefault?.(); this.fail(Error(event.message ?? 'Guardian Worker failed')); };
   this.resize(); const surface = canvas.transferControlToOffscreen(); this.transferred = true; this.worker.postMessage({ type: 'init', canvas: surface, viewport: this.viewport, diagnostics }, [surface]); }
  catch (error) { this.fail(error); }
 }
 resize() {
  const width = Math.max(2, this.canvas.clientWidth), height = Math.max(2, this.canvas.clientHeight), dpr = globalThis.devicePixelRatio || 1;
  const old = this.viewport; this.viewport = { width, height, dpr };
  if (!old || old.width !== width || old.height !== height || old.dpr !== dpr) this.resizePending = true;
  const a = width / height, half = Math.max(.56,.36/a); Object.assign(this.camera, { left: -half*a, right: half*a, top: half, bottom: -half }); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
 }
 setRecord(record) { if (!this.closed) this.worker.postMessage({ type: 'record', record: record ?? null }); }
 draw(frame) {
  if (this.closed) return;
  const audio = frame.audio ? { currentTime: frame.audio.currentTime, ended: frame.audio.ended } : null;
  this.pending = { frame: { ...frame, audio }, manual: { ...this.manual }, pointTarget: this.pointTarget?.toArray() ?? null }; this.pump();
 }
 pump() {
  if (this.closed || !this.readyState || this.inflight || !this.pending) return;
  const payload = this.pending; this.pending = null; this.inflight = true;
  const viewport = this.resizePending ? this.viewport : null; this.resizePending = false;
  try { this.worker.postMessage({ type: 'frame', sequence: ++this.sequence, viewport, ...payload }); } catch (error) { this.fail(error); }
 }
 receive(data) {
  if (this.closed) return;
  if (data.type === 'error') return this.fail(Error(data.message));
  if (data.type === 'ready') { clearTimeout(this.timer); this.readyState = true; this.resolve(); this.pump(); }
  if (data.type === 'frame' && this.inflight && data.sequence === this.sequence) { this.inflight = false; this.metrics = data.metrics; this.face.error = data.faceError; this.diagnostics = data.diagnostics; this.pump(); }
 }
 fail(error) { if (this.closed) return; const wasReady = this.readyState; this.dispose(error); if (wasReady) this.onFailure(error); }
 dispose(error = Error('Guardian Worker disposed')) { if (this.closed) return; this.closed = true; this.pending = null; clearTimeout(this.timer); this.worker?.terminate(); this.reject(error); }
}
