# Windows · e7361fe

La Action [37566311374](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37566311374) terminó con éxito contra e7361fe380bd8c0fefb93747b6b148b83107f838. `run.json` conserva el estado de los pasos, `full.log.gz` el log completo y `result.json` los hashes/procedencia de los informes originales descargados.

Artefactos presentes: instalador NSIS de 325.205.313 bytes y ejecutable de 327.648.768 bytes. No se han descargado esos binarios en esta revisión; se verifica su existencia/tamaño mediante el inventario de la Action.

Se contrastaron los informes originales `desktop-smoke.json.gz` y `desktop-visibility.json.gz`: ambos `ok=true`; el smoke registra 20 modelos y 12 segundos de audio. El ensayo de minimización real registra 300.098,9 ms oculto, con proyecciones de simulación inicial/final idénticas, pausa de menú conservada al restaurar y 1,1 segundos simulados después de reanudar. No modifica `document.hidden` ni sintetiza el evento de visibilidad.

La comparación excluye `savedAt`, avisos, presentación del tutorial y su contador `nextId`, según el alcance del informe. No es una prueba de pantalla encendida en Android, de escucha perceptual ni de toda la campaña renderizada. Esta Action incluye la optimización de índices históricos y precede al cambio posterior de caché de sombras deb33ff.
