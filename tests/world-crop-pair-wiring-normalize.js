export function normalizePairWiring(file,text){
 if(file==='src/app/main.js')return text.replace("import {applyLoadingCropPairOverlap} from './loading-crop-pair-option.js';\n",'').replace('applyLoadingCropPairOverlap(owner);','');
 if(file==='src-tauri/src/main.rs')return text.replace('                if std::env::args().any(|arg| arg == "--smoke-crop-pair-overlap") {\n                    let _ = webview.eval("window.__desktopSmokeCropPairOverlap = true;");\n                }\n','');
 if(file==='src-tauri/smoke.js')return text.replace('    report.checks.loadingRecipe={cropPairOverlap:window.__desktopSmokeCropPairOverlap===true};\n','');
 if(file==='.github/workflows/windows.yml')return text.replace("      crop_pair_overlap:\n        description: 'Overlap complete World steady and bridge sources (experimental)'\n        type: boolean\n        required: false\n        default: false\n",'').replace("          if ('${{ github.event.inputs.crop_pair_overlap }}' -eq 'true') { $smokeArguments += '--smoke-crop-pair-overlap' }\n",'');
 return text;
}
