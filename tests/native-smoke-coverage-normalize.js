// Only exact smoke coverage QA hunks; no broad source suppression.
const rows=[
  {
    "file": "src/app/main.js",
    "before": "",
    "after": "import {publishNativeSmokeCoverage} from './native-smoke-coverage.js';\n"
  },
  {
    "file": "src/app/main.js",
    "before": "function clearWorld(){gameplayGpuQa?.close();clearLoadingPresentation();libraryViewer?.dispose();libraryViewer=null;dialogVoice.stop();raidLoading?.remove();raidLoading=null;noticeLifetime.reset();eventCards=null;surfaces.reset();uiAudio.reset();toolSession.clear();budgetWarningUntil=0;lastBudgetBalance=Infinity;reserveWarningShown=false;pendingVillage=null;commandFeedback='';setTutorialInteraction(false);tutorial=null;hudHand?.dispose();hudHand=null;guardian?.dispose();guardian=null;world?.dispose();world=null;nav=null;audio.stop();tool=null;selection=null;document.querySelector('#native-hud-style')?.remove();}\n",
    "after": "function clearWorld(){if(globalThis.__desktopSmokeCoverage===true)publishNativeSmokeCoverage(null,'disposed');gameplayGpuQa?.close();clearLoadingPresentation();libraryViewer?.dispose();libraryViewer=null;dialogVoice.stop();raidLoading?.remove();raidLoading=null;noticeLifetime.reset();eventCards=null;surfaces.reset();uiAudio.reset();toolSession.clear();budgetWarningUntil=0;lastBudgetBalance=Infinity;reserveWarningShown=false;pendingVillage=null;commandFeedback='';setTutorialInteraction(false);tutorial=null;hudHand?.dispose();hudHand=null;guardian?.dispose();guardian=null;world?.dispose();world=null;nav=null;audio.stop();tool=null;selection=null;document.querySelector('#native-hud-style')?.remove();}\n"
  },
  {
    "file": "src/app/main.js",
    "before": "  if(starting)return;progressQa?.lifecycle('app-start-game-received');starting=true;screen='loading';clearWorld();screenWakeLock.setActive(true);\n",
    "after": "  if(starting)return;if(globalThis.__desktopSmokeCoverage===true)publishNativeSmokeCoverage(null,'starting');progressQa?.lifecycle('app-start-game-received');starting=true;screen='loading';clearWorld();screenWakeLock.setActive(true);\n"
  },
  {
    "file": "src/app/main.js",
    "before": "    state=next;audio.remember(state.events);loadingProgress.update('configuration');\n",
    "after": "    state=next;if(globalThis.__desktopSmokeCoverage===true)publishNativeSmokeCoverage(state,'configuration');audio.remember(state.events);loadingProgress.update('configuration');\n"
  },
  {
    "file": "src/app/main.js",
    "before": "    world.render(0);loadingOverlay?.dispose();loadingOverlay=null;document.querySelector('#stage').classList.remove('world-loading');document.querySelector('#stage').setAttribute('aria-busy','false');tutorial=new TutorialController(state,tutorialProfile,{onError:e=>error('No se ha podido guardar la memoria del tutorial: '+e.message),isNarrating:id=>guardian?.voice?.active&&guardian?.key?.startsWith(id+':')});screen='game';screenWakeLock.setActive(true);bind('pause',pauseDialog);lastFrame=performance.now();updateUI(true);save();audio.gameplay(state.day).catch(()=>{});\n",
    "after": "    world.render(0);loadingOverlay?.dispose();loadingOverlay=null;document.querySelector('#stage').classList.remove('world-loading');document.querySelector('#stage').setAttribute('aria-busy','false');tutorial=new TutorialController(state,tutorialProfile,{onError:e=>error('No se ha podido guardar la memoria del tutorial: '+e.message),isNarrating:id=>guardian?.voice?.active&&guardian?.key?.startsWith(id+':')});screen='game';if(globalThis.__desktopSmokeCoverage===true)publishNativeSmokeCoverage(state,'ready');screenWakeLock.setActive(true);bind('pause',pauseDialog);lastFrame=performance.now();updateUI(true);save();audio.gameplay(state.day).catch(()=>{});\n"
  },
  {
    "file": "src-tauri/src/main.rs",
    "before": "",
    "after": "                }\n                match smoke_coverage_selection(&std::env::args().collect::<Vec<_>>()) {\n                    Ok(Some(selection)) => { let _ = webview.eval(&format!(\"window.__desktopSmokeCoverage = true; window.__desktopSmokeSelection = {};\", selection)); }\n                    Err(error) => { let _ = webview.eval(&format!(\"window.__desktopSmokeCoverageError = {};\", serde_json::json!(error))); }\n                    Ok(None) => {}\n"
  },
  {
    "file": "src-tauri/src/main.rs",
    "before": "",
    "after": "\n// Explicit paired selection is available only inside the guarded smoke page load.\nfn smoke_coverage_selection(args: &[String]) -> Result<Option<serde_json::Value>, String> {\n    if !args.iter().any(|arg| arg == \"--smoke-report\") { return Ok(None); }\n    let read = |flag: &str| -> Result<Option<String>, String> {\n        let indexes: Vec<_> = args.iter().enumerate().filter(|(_, arg)| arg.as_str() == flag).map(|(index, _)| index).collect();\n        if indexes.len() > 1 { return Err(format!(\"Duplicate {}\", flag)); }\n        match indexes.first() {\n            Some(index) => args.get(index + 1).filter(|value| !value.starts_with(\"--\")).cloned().map(Some).ok_or(format!(\"Missing {} value\", flag)),\n            None => Ok(None),\n        }\n    };\n    match (read(\"--smoke-biome\")?, read(\"--smoke-culture\")?) {\n        (None, None) => Ok(None),\n        (Some(biome), Some(culture)) => {\n            if ![\"sabana\", \"gran-rio\", \"manglares\", \"volcanes\", \"gran-canon\", \"desierto\"].contains(&biome.as_str()) || ![\"mapungubwe\", \"saheliana\", \"suajili\", \"musgum\", \"etiope\"].contains(&culture.as_str()) { return Err(\"Invalid smoke biome/culture selection\".into()); }\n            Ok(Some(serde_json::json!({\"biome\":biome,\"culture\":culture})))\n        }\n        _ => Err(\"Smoke biome and culture must be supplied together\".into()),\n    }\n}\n\n#[cfg(test)]\nmod smoke_coverage_tests {\n    use super::smoke_coverage_selection;\n    fn args(values: &[&str]) -> Vec<String> { values.iter().map(|value| value.to_string()).collect() }\n    #[test]\n    fn paired_selection_and_off_guard() {\n        assert_eq!(smoke_coverage_selection(&args(&[\"app\", \"--smoke-report\", \"report.json\"])).unwrap(), None);\n        assert_eq!(smoke_coverage_selection(&args(&[\"app\", \"--smoke-biome\", \"sabana\", \"--smoke-culture\", \"musgum\"])).unwrap(), None);\n        let selected=smoke_coverage_selection(&args(&[\"app\", \"--smoke-report\", \"report.json\", \"--smoke-biome\", \"sabana\", \"--smoke-culture\", \"musgum\"])).unwrap().unwrap();\n        assert_eq!(selected[\"biome\"], \"sabana\"); assert_eq!(selected[\"culture\"], \"musgum\");\n    }\n    #[test]\n    fn partial_duplicate_missing_and_invalid_fail() {\n        for tail in [vec![\"--smoke-biome\", \"sabana\"],vec![\"--smoke-culture\", \"musgum\"],vec![\"--smoke-biome\"],vec![\"--smoke-biome\", \"bad\", \"--smoke-culture\", \"musgum\"],vec![\"--smoke-biome\", \"sabana\", \"--smoke-culture\", \"bad\"],vec![\"--smoke-biome\", \"sabana\", \"--smoke-biome\", \"sabana\", \"--smoke-culture\", \"musgum\"]] {\n            let mut values=vec![\"app\", \"--smoke-report\", \"report.json\"]; values.extend(tail);\n            assert!(smoke_coverage_selection(&args(&values)).is_err());\n        }\n    }\n}\n"
  },
  {
    "file": "src-tauri/smoke.js",
    "before": "",
    "after": "    if(window.__desktopSmokeCoverage===true&&!report.checks.worldSelection)report.checks.worldSelection={requested:window.__desktopSmokeSelection,actual:window.__wildGuardiansSmokeCoverage??null};\n"
  },
  {
    "file": "src-tauri/smoke.js",
    "before": "",
    "after": "  }\n  function checkSmokeCoveragePreview(selection,preview) {\n    if(preview?.biome!==selection.biome||preview?.culture!==selection.culture)throw Error('Fixture preview does not match requested smoke selection');\n  }\n  function checkSmokeCoverageReady(selection,observation,fixture) {\n    if(observation?.phase!=='ready'||observation.actual?.biome!==selection.biome||observation.actual?.culture!==selection.culture||(fixture&&observation.actual.slotId!==fixture.slotId))throw Error('Actual ready world does not match smoke selection');\n"
  },
  {
    "file": "src-tauri/smoke.js",
    "before": "",
    "after": "    if (window.__desktopSmokeCoverageError) throw Error(window.__desktopSmokeCoverageError);\n    const selection=window.__desktopSmokeSelection??{biome:'gran-canon',culture:'mapungubwe'};\n    if (!['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'].includes(selection.biome)||!['mapungubwe','saheliana','suajili','musgum','etiope'].includes(selection.culture)) throw Error('Invalid smoke world selection');\n"
  },
  {
    "file": "src-tauri/smoke.js",
    "before": "",
    "after": "      if(window.__desktopSmokeCoverage===true)checkSmokeCoveragePreview(selection,report.checks.fixtureMenuList.preview);\n"
  },
  {
    "file": "src-tauri/smoke.js",
    "before": "    else send({action: 'start', biome: 'gran-canon', culture: 'mapungubwe'});\n",
    "after": "    else send({action: 'start', biome: selection.biome, culture: selection.culture});\n"
  },
  {
    "file": "src-tauri/smoke.js",
    "before": "    report.checks.world = {biome: 'gran-canon', culture: 'mapungubwe', width: world.width, height: world.height};\n",
    "after": "    const restored=report.checks.fixtureMenuList?.preview;\n    report.checks.world = {biome: restored?.biome??selection.biome, culture: restored?.culture??selection.culture, width: world.width, height: world.height, provenance:restored?'actual menu save preview':'requested NewGame selection'};\n    if(window.__desktopSmokeCoverage===true){\n      const observation=window.__wildGuardiansSmokeCoverage;\n      report.checks.worldSelection={requested:selection,restoredPreview:restored??null,actual:observation??null,scope:'Scalar App configuration/ready provenance; no synthetic clock or saved crops.'};\n      checkSmokeCoverageReady(selection,observation,fixture);\n    }\n"
  }
];
export function normalizeCoverageWiring(file,text){
 for(const row of rows)if(row.file===file)text=text.replace(row.after,row.before);
 return text;
}
