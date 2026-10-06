# Ejecutable Windows a28c843

[Build Windows desktop 37470586181](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37470586181) termina success sobre a28c8435b96eff79c4011b41a85ed11224287ec4. Publica EXE e instalador NSIS, además de estos informes originales y la captura de Gran Cañón/Mapungubwe. Se inspecciona la captura: poblado a ambos lados del río en el cañón. No prueba una partida completa ni todos los biomas.

Ambos informes indican ok:true y errors:[]: WebView2 nativo, los 20 GLB runtime decodificados, WebGL2, worker, almacenamiento y un Opus ambiental estéreo de 12 s a 44,1 kHz. La prueba de visibilidad usa minimización/restauración real, guardado IndexedDB y 300.858,4 ms ocultos. Los estados de simulación comparados son idénticos. Restaurar conserva menu; continuar avanza 0,8302 s simulados durante 4.411,9 ms visibles, sin recuperar tiempo offline.

QA-014 sigue parcial: esta ruta Windows no demuestra ocultación de pestaña web ni teléfono físico. Audio silenciado; no acredita escucha ni rendimiento GPU del usuario. Fuentes y comprobaciones: src-tauri/smoke.js del commit indicado.

SHA-256 de artefactos originales, contrastados con metadata de GitHub:

- desktop-smoke.json: fd5e9432e0298fa88ffc2223a0347b5b224d7517d2ca682e452dd4210359dd1b
- desktop-visibility.json: 7fcfa86106e4f9e8c5c5feb5ebe219d51a69e32dca7f7e38f8248279f8f47e84
- windows-canyon.png: a788d914c877a7367a58dc7d661b078decf085672181f9a30aa58a2b01afd1c3

Los artefactos v7 archive:false se recuperan como bytes originales; no son ZIP aunque el endpoint termine en /zip. La concurrencia actual de Windows conserva la ejecución activa (cancel-in-progress:false); Validate conserva cancel-in-progress:true.
