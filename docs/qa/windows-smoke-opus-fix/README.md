# Reparación del smoke Windows tras distribuir Opus

El [run 37389156017](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37389156017) compiló el ejecutable y el instalador, pero falló durante el smoke WebView2. Su [informe nativo original](prior-report.json) acredita que los veinte GLB se descodificaron; después produjo `Invalid decoded GLB` al continuar recorriendo el manifiesto de distribución, que ahora incluye también audio e índices.

El smoke filtra los registros GLB antes de llamar al descodificador geométrico. Además resuelve el catálogo SFX mediante los alias del mismo manifiesto y reproduce la URL declarada en el recurso, evitando tanto buscar el JSON original excluido del paquete como reconstruir un nombre MP3 que ya no se distribuye. Conserva la prueba nativa de audio, WebGL, worker, almacenamiento, menú, mundo y visibilidad; no elimina los controles que fallaron.

`node --check src-tauri/smoke.js` es correcto. [Selección en el paquete real](package-resources.json): veinte modelos de 172 registros y primer SFX Opus existente en la ruta declarada. Esto no acredita ejecución nativa de la corrección: queda pendiente el nuevo run Windows, incluida la minimización/restauración. Los artefactos previos de exe/instalador existen, pero el smoke fallido impide declarar esa versión verificada.

Los artefactos están subidos con `archive: false`. La versión local de `gh run download` intentó interpretarlos como ZIP y falló; el informe se recuperó sin alteración desde el endpoint de artefactos mediante `gh api`, que devuelve sus bytes JSON directamente.
