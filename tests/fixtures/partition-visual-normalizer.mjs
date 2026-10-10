import {undoPreflightQa} from './preflight-comparison-normalizer.mjs';
export const rustGuard=`                    if std::env::args().any(|arg| arg == "--smoke-visual-plant") {
                        let _ = webview.eval("window.__desktopSmokeVisualPlant = true;");
                        if std::env::args().any(|arg| arg == "--smoke-visual-plant-progress65") {
                            let _ = webview.eval("window.__desktopSmokeVisualPlantProgress65 = true;");
                        }
                    }
`;
export function undoVisualQa(path,source){
 let text=undoPreflightQa(path,source.replaceAll('\r\n','\n'));
 if(path==='src/app/main.js')text=text.replace("import {installLoadingVisualQa} from './loading-visual-bridge.js';\n",'').replace(',visual:globalThis.__desktopSmokeVisualCapture===true?installLoadingVisualQa(owner,diorama):null','').replace('pending.visual?.close({cancelled:true});','').replace('loadingDiorama?.visualQa?.close({cancelled:true});','').replace('prepared.visual?.close();','');
 if(path==='src/rendering/loading-diorama.js')text=text.replace('\n    if(!skyOnly)this.onAfterDraw?.(this,progress);','');
 if(path==='src-tauri/src/main.rs')text=text.replace(rustGuard,'');
 return text;
}
