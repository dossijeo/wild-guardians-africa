#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(_)) {
                if let Some(host) = window.app_handle().get_webview_window(window.label()) {
                    // WebView2 does not automatically mirror a minimized host.
                    // Update the native controller so the page receives its
                    // genuine visibilitychange and the existing hidden pause.
                    let view: &tauri::Webview = host.as_ref();
                    let hidden = window.is_minimized().unwrap_or(false)
                        || !window.is_visible().unwrap_or(true);
                    let result = if hidden { view.hide() } else { view.show() };
                    if let Err(error) = result { eprintln!("Webview visibility: {error}"); }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![desktop_smoke_report, desktop_smoke_fixture, desktop_smoke_minimize])
        .on_page_load(|webview, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Finished
                && std::env::args().any(|arg| arg == "--smoke-report")
                && webview.label() == "main"
            {
                if std::env::args().any(|arg| arg == "--smoke-crop-pair-overlap") {
                    let _ = webview.eval("window.__desktopSmokeCropPairOverlap = true;");
                }
                if std::env::args().any(|arg| arg == "--smoke-loading-trace") {
                    let _ = webview.eval("window.__desktopSmokeLoadingTrace = true;");
                }
                // Visual readbacks are opt-in and deliberately excluded from
                // ordinary smoke/timing runs. The app owns the capture lifecycle.
                if std::env::args().any(|arg| arg == "--smoke-visual") {
                    let _ = webview.eval("window.__desktopSmokeVisualCapture = true;");
                    if std::env::args().any(|arg| arg == "--smoke-visual-plant") {
                        let _ = webview.eval("window.__desktopSmokeVisualPlant = true;");
                        if std::env::args().any(|arg| arg == "--smoke-visual-plant-progress65") {
                            let _ = webview.eval("window.__desktopSmokeVisualPlantProgress65 = true;");
                        }
                    }
                }
                match smoke_coverage_selection(&std::env::args().collect::<Vec<_>>()) {
                    Ok(Some(selection)) => { let _ = webview.eval(&format!("window.__desktopSmokeCoverage = true; window.__desktopSmokeSelection = {};", selection)); }
                    Err(error) => { let _ = webview.eval(&format!("window.__desktopSmokeCoverageError = {};", serde_json::json!(error))); }
                    Ok(None) => {}
                }
                let _ = webview.eval(include_str!("../smoke.js"));
            }
        })
        .run(tauri::generate_context!())
        .expect("Failed to run Wild Guardians Africa");
}

#[tauri::command]
fn desktop_smoke_fixture() -> Result<Option<serde_json::Value>, String> {
    let args: Vec<String> = std::env::args().collect();
    if !args.iter().any(|arg| arg == "--smoke-report") { return Err("Smoke mode is disabled".into()); }
    let Some(index) = args.iter().position(|arg| arg == "--smoke-fixture") else { return Ok(None); };
    let path = args.get(index + 1).ok_or("Missing smoke fixture path")?;
    let text = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&text).map(Some).map_err(|error| error.to_string())
}

#[tauri::command]
fn desktop_smoke_minimize(app: tauri::AppHandle) -> Result<bool, String> {
    if !std::env::args().any(|arg| arg == "--smoke-report") { return Err("Smoke mode is disabled".into()); }
    let window = app.get_webview_window("main").ok_or("Main window missing")?;
    window.minimize().map_err(|error| error.to_string())?;
    let minimized = window.is_minimized().map_err(|error| error.to_string())?;
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(310));
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    });
    Ok(minimized)
}

#[tauri::command]
fn desktop_smoke_report(app: tauri::AppHandle, report: serde_json::Value) -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    let index = args.iter().position(|arg| arg == "--smoke-report").ok_or("Smoke mode is disabled")?;
    let path = args.get(index + 1).ok_or("Missing smoke report path")?;
    std::fs::write(path, serde_json::to_vec_pretty(&report).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    app.exit(if report["ok"].as_bool() == Some(true) { 0 } else { 1 });
    Ok(())
}

// Explicit paired selection is available only inside the guarded smoke page load.
fn smoke_coverage_selection(args: &[String]) -> Result<Option<serde_json::Value>, String> {
    if !args.iter().any(|arg| arg == "--smoke-report") { return Ok(None); }
    let read = |flag: &str| -> Result<Option<String>, String> {
        let indexes: Vec<_> = args.iter().enumerate().filter(|(_, arg)| arg.as_str() == flag).map(|(index, _)| index).collect();
        if indexes.len() > 1 { return Err(format!("Duplicate {}", flag)); }
        match indexes.first() {
            Some(index) => args.get(index + 1).filter(|value| !value.starts_with("--")).cloned().map(Some).ok_or(format!("Missing {} value", flag)),
            None => Ok(None),
        }
    };
    match (read("--smoke-biome")?, read("--smoke-culture")?) {
        (None, None) => Ok(None),
        (Some(biome), Some(culture)) => {
            if !["sabana", "gran-rio", "manglares", "volcanes", "gran-canon", "desierto"].contains(&biome.as_str()) || !["mapungubwe", "saheliana", "suajili", "musgum", "etiope"].contains(&culture.as_str()) { return Err("Invalid smoke biome/culture selection".into()); }
            Ok(Some(serde_json::json!({"biome":biome,"culture":culture})))
        }
        _ => Err("Smoke biome and culture must be supplied together".into()),
    }
}

#[cfg(test)]
mod smoke_coverage_tests {
    use super::smoke_coverage_selection;
    fn args(values: &[&str]) -> Vec<String> { values.iter().map(|value| value.to_string()).collect() }
    #[test]
    fn paired_selection_and_off_guard() {
        assert_eq!(smoke_coverage_selection(&args(&["app", "--smoke-report", "report.json"])).unwrap(), None);
        assert_eq!(smoke_coverage_selection(&args(&["app", "--smoke-biome", "sabana", "--smoke-culture", "musgum"])).unwrap(), None);
        let selected=smoke_coverage_selection(&args(&["app", "--smoke-report", "report.json", "--smoke-biome", "sabana", "--smoke-culture", "musgum"])).unwrap().unwrap();
        assert_eq!(selected["biome"], "sabana"); assert_eq!(selected["culture"], "musgum");
    }
    #[test]
    fn partial_duplicate_missing_and_invalid_fail() {
        for tail in [vec!["--smoke-biome", "sabana"],vec!["--smoke-culture", "musgum"],vec!["--smoke-biome"],vec!["--smoke-biome", "bad", "--smoke-culture", "musgum"],vec!["--smoke-biome", "sabana", "--smoke-culture", "bad"],vec!["--smoke-biome", "sabana", "--smoke-biome", "sabana", "--smoke-culture", "musgum"]] {
            let mut values=vec!["app", "--smoke-report", "report.json"]; values.extend(tail);
            assert!(smoke_coverage_selection(&args(&values)).is_err());
        }
    }
}
