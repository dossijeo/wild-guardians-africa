// Resource scheduling only: all existing loaders, ownership and readiness
// boundaries remain with their callers. No GPU work or partial adoption here.
export async function overlapLoadingResources({assertOpen,sky,catalogues,resources}){
  assertOpen();
  // Start through promises so synchronous loader failures also have handlers
  // before the sibling starts. Promise.all observes every late rejection.
  const skyPending=Promise.resolve().then(()=>{assertOpen();return sky();});
  const resourcesPending=Promise.resolve().then(()=>{assertOpen();return catalogues();}).then(data=>{
    assertOpen();
    const starts=resources(data);
    return Promise.all(starts.map(start=>Promise.resolve().then(()=>{assertOpen();return start();})));
  });
  const [,loaded]=await Promise.all([skyPending,resourcesPending]);
  assertOpen();
  return loaded;
}

// Only the packaged smoke may select this experimental schedule.
export function loadingResourceOverlapEnabled(host=globalThis){
  return host.__desktopSmokeStarted===true&&host.__desktopSmokeResourceOverlap===true;
}
