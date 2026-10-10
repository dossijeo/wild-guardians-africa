export function normalizeTrace(file,text){
 text=text.replaceAll('\r\n','\n');
 if(file==='src/app/main.js')return text.replace("import {installNativeLoadingTrace} from './native-loading-trace-bridge.js';\n",'').replace('let owner,diorama,trace;','let owner,diorama;').replace('trace=installNativeLoadingTrace(owner);','').replace(',trace,visual:',',visual:').replace('pending.trace?.close({cancelled:true});','').replace('prepared.trace?.connect();','').replace('prepared.trace?.close();','');
 if(file==='src-tauri/src/main.rs')return text.replace('                if std::env::args().any(|arg| arg == "--smoke-loading-trace") {\n                    let _ = webview.eval("window.__desktopSmokeLoadingTrace = true;");\n                }\n','');
 if(file==='src-tauri/smoke.js')return text.replace(`    if (window.__desktopSmokeLoadingTrace === true) {
      try { report.checks.nativeLoadingTrace = window.__wildGuardiansNativeLoadingTrace?.report ?? {available:false}; }
      catch (traceError) { report.checks.nativeLoadingTrace = {available:false,error:String(traceError)}; }
    }
`,'');
 return text;
}
