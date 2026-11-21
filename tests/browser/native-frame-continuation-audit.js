// Prepared packets stop normal recording while their proposal is ready. The
// former camera-induced post-ready stale-frame scenario cannot occur on this
// path anymore. Preserve this QA entry point with the stronger precommit stall
// audit; retained obsolete-frame safety remains covered in remote-webgpu.test.js.
export {auditNativePreparedTerrainCutover as auditNativeFrameContinuation} from './native-prepared-terrain-cutover.js';
