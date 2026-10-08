// Optional DEV-only integration report. Observes the real shared AudioSystem;
// never starts a voice, unlocks audio or changes volume/admission itself.
export function installLoadingAudioQa(audio, doc = document) {
  const element = doc.createElement('script');
  element.id = 'loading-audio-qa';
  element.type = 'application/json';
  doc.head.append(element);
  const report = {events: []};
  const refresh = () => {
    report.context = audio.context?.state ?? 'uncreated';
    report.masterGain = audio.sfxGain?.gain.value ?? null;
    report.loadingVoices = [...audio.voices.values()]
      .filter(voice => voice.emitter?.startsWith('loading:'))
      .map(voice => ({emitter: voice.emitter, family: voice.family, bus: voice.bus}));
    element.textContent = JSON.stringify(report);
  };
  const record = entry => {
    report.events.push({...entry, at: performance.now()});
    if (report.events.length > 128) report.events.shift();
    refresh();
  };
  for (const method of ['sound', 'ambientSound']) {
    const original = audio[method].bind(audio);
    audio[method] = async (id, options) => {
      if (!options?.emitter?.startsWith('loading:')) return original(id, options);
      record({type: 'request', method, id, emitter: options.emitter});
      try {
        const source = await original(id, options);
        record({type: 'result', method, id, emitter: options.emitter,
          started: !!source, bus: source ? audio.voices.get(source)?.bus : null});
        return source;
      } catch (error) {
        record({type: 'error', method, id, message: String(error)});
        throw error;
      }
    };
  }
  const unlock = audio.unlock.bind(audio);
  audio.unlock = async (...args) => {
    record({type: 'unlock-request'});
    try {const result = await unlock(...args); record({type: 'unlock-result'}); return result;}
    catch (error) {record({type: 'unlock-error', message: String(error)}); throw error;}
  };
  const stop = audio.stopVoice.bind(audio);
  audio.stopVoice = source => {
    const voice = audio.voices.get(source), result = stop(source);
    if (voice?.emitter?.startsWith('loading:')) record({type: 'stop', emitter: voice.emitter, family: voice.family});
    return result;
  };
  refresh();
}
