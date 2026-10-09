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
                // Explicit smoke-only selection; normal gameplay never evaluates it.
                let overlap = std::env::args().any(|arg| arg == "--smoke-resource-overlap");
                let compile_window = std::env::args().any(|arg| arg == "--smoke-compile-window");
                let _ = webview.eval(&format!("window.__desktopSmokeCompileWindow={compile_window};window.__desktopSmokeResourceOverlap={overlap};\n{}", include_str!("../smoke.js")));
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
