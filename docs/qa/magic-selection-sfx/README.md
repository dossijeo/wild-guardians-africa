# Selección de magia · SFX 092

Al pulsar una magia habilitada se arma la herramienta, se cierra su panel silenciosamente y se solicita spirit_select (092) en el bus UI. Las opciones deshabilitadas regresan antes de esa acción. El resto de cierres conserva su sonido habitual. La selección no depende del render ni de un cobro y sustituye el cierre 103 para evitar superponer ambas señales.

Las peticiones tardías caducan a los 0,5 segundos, al cambiar de magia o al reiniciar la escena. Se preservan los bytes MP3 originales y el derivado Opus auditado; se actualizan únicamente las rutas y hashes de metadatos.

Validación: 44/44 pruebas de ui-audio, audio-routing y audio-buses; verify_sfx_runtime y audit_sfx_catalog --check correctos; compilación Vite correcta (222 módulos). Inventario completo: 92 conectados y 34 pendientes. Estos checks acreditan asignación, ciclo de vida y bytes; no certifican escucha en móvil ni un recorrido completo del HUD.

Actualización: al abrir otra superficie también caduca la selección pendiente. La nueva regresión falló antes de corregirlo y pasa después; 45/45 pruebas dirigidas y build correctos. En el navegador nativo las tres selecciones se aceptan en el bus UI con rate1; el cuarto intento, retrasado mediante una compuerta controlada sobre el buffer nativo, se rechaza después de abrir otro panel. El buffer Opus real tiene 2 segundos, 48 kHz y dos canales; consola sin warnings/errores. native.json, native.png y native-sources.json conservan la evidencia. Prueba silenciada de UiAudio/AudioSystem, sin HUD ni mundo3D: no certifica escucha o gameplay móvil.
