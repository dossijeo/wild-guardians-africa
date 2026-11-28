import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

export function readA5Receipt(file) {
  const bytes = readFileSync(file);
  return JSON.parse(file.endsWith('.gz') ? gunzipSync(bytes) : bytes);
}

// All counters come from the existing fixture. This is a report, not another
// resource instrumentation layer. Allocated bytes are not driver residency.
export function summarizeA5(report) {
  const stages = [
    ['cold-first-ready', report.coldStart], ['settled', report.before],
    ...(report.noRecoveryControl ?? []).slice(1).map((s,i)=>['control-'+(i+1),s]),
    ...(report.recoveries ?? []).map((s,i)=>['recovery-'+(i+1),s.after]),
    ['local', report.a5?.local?.after], ['cancel', report.a5?.cancel?.after],
    ['retired', report.a5?.retire?.after],
  ];
  return {
    scope: 'Cumulative instrumented factories and ownership, not frame cadence or driver memory. Cold means a fresh renderer, not flushed OS/driver/disk caches.',
    chunk: report.a5?.chunk,
    stages: stages.filter(([,s])=>s).map(([name,s])=>{
      const r=s.renderer, a=r.qaA5, d=r.drawExecution;
      const attributed={};
      for(const event of r.qaResourceTrace ?? []) {
        const owner=event.scope?.origin?.namespace ?? 'other-or-unattributed';
        const counts=attributed[owner]??={};
        counts[event.kind]=(counts[event.kind]??0)+1;
      }
      return {name,at:s.capturedAt,wanted:r.farCoverage.wanted,offered:r.farCoverage.offered,
        producerResources:d.resourcesCreated,compiles:r.preparation.admission.compilesStarted,
        factories:r.qaCumulativeFactories,uniformForks:d.consumer.uniformForks,bindingForks:d.consumer.bindingForks,
        livePairs:a.live.length,createdPairs:a.createdPairs,retiredPairs:a.retired.length,
        cumulativeCopiedCpuBytes:a.copiedCpuBytes,
        liveCopiedCpuBytes:a.live.reduce((n,p)=>n+p.copiedCpuBytes,0),
        bufferAllocationBytes:r.qaResourceTrace.filter(e=>e.kind==='createBuffer').reduce((n,e)=>n+(e.size??0),0),
        attributed,atlases:a.atlases,textures:a.textures,
        admission:r.preparation.admission,gpuErrors:d.consumer.gpuErrors};
    }),
    progressive:report.farWarmup,
    errors:report.errors, acceptance:report.a5?.acceptance,
  };
}
