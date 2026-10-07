# Selección de magia · SFX 092

Al pulsar una magia habilitada se arma la herramienta, se cierra su panel silenciosamente y se solicita spirit_select (092) en el bus UI. Las opciones deshabilitadas regresan antes de esa acción. El resto de cierres conserva su sonido habitual. La selección no depende del render ni de un cobro y sustituye el cierre 103 para evitar superponer ambas señales.

Las peticiones tardías caducan a los 0,5 segundos, al cambiar de magia o al reiniciar la escena. Se preservan los bytes MP3 originales y el derivado Opus auditado; se actualizan únicamente las rutas y hashes de metadatos.

Validación: 44/44 pruebas de ui-audio, audio-routing y audio-buses; verify_sfx_runtime y audit_sfx_catalog --check correctos; compilación Vite correcta (222 módulos). Inventario completo: 92 conectados y 34 pendientes. Estos checks acreditan asignación, ciclo de vida y bytes; no certifican escucha en móvil ni un recorrido completo del HUD.
