# Cancelación de carga nativa — main 2c26ead

Se ejecutó el visor existente `tests/browser/world-load-cancel.html` en el navegador de la aplicación, con interrupciones de WorldScene.load en cuatro solicitudes reales independientes: building, VFX, ground y mud. Manglares/Mapungubwe, semilla 712; recursos y modelos distribuidos actuales. Cada caso crea y cierra su contexto nativo, espera a que todas las solicitudes interceptadas se resuelvan/rechacen y después lee los registros de propietarios. Una sola pestaña, cerrada al terminar; sin otra escena GPU concurrente.

Los cuatro resultados son `ok:true`: mundo disposed, contexto perdido, estado eliminado y signal abortado. Caché de assets, fuentes de modelos, recursos del propietario, clones de suelo/barro, programas y geometrías quedan a cero. Sin errores registrados ni warn/error en consola. Cada JSON conserva URL, fecha de observación, resultado literal y consola de su navegación. `sources.json` registra commit y hashes de las fuentes examinadas, comprobados de nuevo al cerrar la prueba.

Estas interrupciones prueban el cierre real antes de finalizar la fase elegida. Building cancela durante la solicitud GLB: no sustituye la regresión dirigida de tres barreras concurrentes que reciben una plantilla ya preparada, documentada en ../building-template-close/README.md. Tampoco simulan fallos reales de CDN ni prueban RAM física, toda la partida, todos los puntos de cancelación, móvil/Tauri o la precarga completa sin tirones.

No hay cambios de runtime en este commit de evidencia. Las correcciones de caché/reintento y disposición idempotente se publicaron por separado en b4618a1 y 2c26ead, con pruebas dirigidas y build. No se repiten esas mismas pruebas/build porque las fuentes de producción no cambian.
