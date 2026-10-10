import {normalizeCoverageWiring} from './native-smoke-coverage-normalize.js';
export function normalizePairWiring(file,text){
 text=normalizeCoverageWiring(file,text);
 if(file==='src/app/main.js')return text.replace("import {applyLoadingCropPairOverlap} from './loading-crop-pair-option.js';\n",'').replace('applyLoadingCropPairOverlap(owner);','');
 if(file==='src-tauri/src/main.rs')return text.replace('                        if std::env::args().any(|arg| arg == "--smoke-visual-plant-progress65") {\n                            let _ = webview.eval("window.__desktopSmokeVisualPlantProgress65 = true;");\n                        }\n','').replace('                if std::env::args().any(|arg| arg == "--smoke-crop-pair-overlap") {\n                    let _ = webview.eval("window.__desktopSmokeCropPairOverlap = true;");\n                }\n','');
 if(file==='src-tauri/smoke.js')return text.replace(`        if (window.__desktopSmokeVisualPlantProgress65 === true) {
          const before = visual?.frames?.find(frame=>frame.label==='preplant');
          const mid = visual?.frames?.find(frame=>frame.label==='catchup-mid');
          const mature = visual?.frames?.find(frame=>frame.label==='mature');
          if (!before || before.progress<.65 || before.plants.length!==4 || action?.progress<.65 || !mid || mid.plants.length!==5 || !(mid.plants[4].growth>0 && mid.plants[4].growth<mid.plants[0].growth) || !mature || mature.plants.length!==5 || !mature.plants.every(plant=>plant.growth===mature.plants[0].growth)) {
            report.errors.push('Natural-progress65 planting/catch-up evidence is missing or failed');
          }
        }
`,'').replace('    report.checks.loadingRecipe={cropPairOverlap:window.__desktopSmokeCropPairOverlap===true};\n','');
 if(file==='.github/workflows/windows.yml')return text.replace("      crop_pair_overlap:\n        description: 'Overlap complete World steady and bridge sources (experimental)'\n        type: boolean\n        required: false\n        default: false\n",'').replace("          if ('${{ github.event.inputs.crop_pair_overlap }}' -eq 'true') { $smokeArguments += '--smoke-crop-pair-overlap' }\n",'');
 return text;
}
