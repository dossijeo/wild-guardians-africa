// These transactions may have consumed local upload bookkeeping without
// publishing their command buffers. Recovery must create fresh GPU resources;
// retrying the old renderer can silently omit those uploads.
export function isPreparedFrameInvalidation(error) {
  return error?.code === 'historical-playback-invalidated' || error?.code === 'remote-frame-native-mutation-obsolete';
}
