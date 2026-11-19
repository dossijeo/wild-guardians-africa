// Additional scenarios on the SAME paused actual-main Worker and far owner.
// Invalidates graphical coverage only; never writes native world state.
export async function runA5MainPhases(page,inspect,report,{prefix}={}){
  const worker=page.workers().find(w=>w.url().includes('native-worker-world-audit-worker.js'));
  if(!worker)throw Error('A5 original audit Worker missing');
  async function settled(predicate=()=>true){
    const deadline=Date.now()+60000;
    for(;;){const s=await inspect(),f=s.renderer.farCoverage,a=s.renderer.preparation.admission;
      if(f.wanted>0&&f.offered===f.wanted&&!f.pending&&!f.deferred&&!a.active&&!a.queued&&!a.inflightCompiles&&predicate(s))return s;
      if(Date.now()>deadline){report.last=s;throw Error('A5 regional scenario did not settle');}await page.waitForTimeout(150);
    }
  }
  report.scope='Original paused main/Workers/WASM/Surface. Local graphical revalidation of unchanged native data, candidate cancellation and coverage-owner retirement; not native terrain mutation or recovery from device loss.';
  report.local={before:await settled()};
  const inventory=report.local.before.renderer.qaA5;
  const first=inventory?.live.findLast(p=>p.attached&&Number.isSafeInteger(p.cx)&&Number.isSafeInteger(p.cz)&&inventory.nonresidentChunks.includes(`${p.cx},${p.cz}`));
  if(!first)throw Error('A5 no live nonresident far pair with a chunk owner');
  report.images=[];const capture=async name=>{if(prefix){const path=prefix+'-a5-'+name+'.png';await page.locator('.qa-webgpu-world').screenshot({path});report.images.push(path);}};
  await capture('settled');
  const chunk={cx:first.cx,cz:first.cz};report.chunk=chunk;
  await worker.evaluate(chunk=>globalThis.__a5Audit.invalidate(chunk),chunk);
  report.local.after=await settled(s=>s.renderer.qaA5.live.some(p=>p.cx===chunk.cx&&p.cz===chunk.cz&&p.id!==first.id));
  await capture('local');
  report.cancel={before:report.local.after};
  await worker.evaluate(chunk=>globalThis.__a5Audit.invalidate(chunk,{cancelCandidate:true}),chunk);
  report.cancel.after=await settled(s=>s.renderer.qaA5.events.some(e=>e.kind==='cancel-request')&&s.renderer.qaA5.live.every(p=>!s.renderer.qaA5.events.some(e=>e.kind==='cancel-request'&&e.pair===p.id)));
  await capture('cancel');
  report.retire={before:report.cancel.after};
  await worker.evaluate(()=>globalThis.__a5Audit.retireCoverage());
  const deadline=Date.now()+30000;
  for(;;){const s=await inspect();report.retire.after=s;
    const ids=report.retire.before.renderer.qaA5.live.flatMap(p=>[...p.model.attributes,...p.impostor.attributes].map(a=>a.reference).filter(Boolean));
    const destroyed=new Set(s.renderer.qaResourceTrace.filter(r=>r.kind==='destroy').map(r=>r.reference));
    if(s.renderer.qaA5.coverage.closed&&s.renderer.qaA5.live.length===0&&ids.every(id=>destroyed.has(id)))break;
    if(Date.now()>deadline)throw Error('A5 private far buffers did not retire');await page.waitForTimeout(150);
  }
  report.retire.drained=await worker.evaluate(()=>globalThis.__a5Audit.drain());
  report.retire.after=await inspect();
  await capture('retired');
  return report;
}
