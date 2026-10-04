#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_smoke_report])
        .on_page_load(|webview, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Finished
                && std::env::args().any(|arg| arg == "--smoke-report")
                && webview.label() == "main"
            {
                let _ = webview.eval(include_str!("../smoke.js"));
            }
        })
        .run(tauri::generate_context!())
        .expect("Failed to run Wild Guardians Africa");
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
