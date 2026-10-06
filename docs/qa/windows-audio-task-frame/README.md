# Windows verificado tras los índices compartidos de audio

[Action Windows](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37527350032) terminada correctamente, SHA `7779a8ec6438388afba06244424f304f84c64b92`. Tauri construyó el ejecutable (327.141.376 bytes) y el instalador NSIS (324.737.857 bytes); ambos constan como artefactos sin caducar, junto con los informes WebView2. Tamaños procedentes de la API, no de una descarga/instalación local del binario.

Los dos JSON descargados directamente del servicio de artefactos tienen `ok: true`. El smoke carga modelos, ambiente Opus, workers, WebGL2, almacenamiento y mundo de Gran Cañón/Mapungubwe. El reporte de visibilidad confirma una minimización nativa real durante 300.708,1 ms. Los 22 campos de simulación de hiddenStart/hiddenEnd coinciden exactamente; al restaurar mantiene la pausa de menú y reanuda 0,7203 segundos simulados, sin recuperar el intervalo offline. IndexedDB figura como backend en el reporte de visibilidad. Alcance/exclusiones íntegros en verification.json.

Se conservan resultados/pasos por SHA, inventario de artefactos y ambos informes completos comprimidos. El cliente gh run download trató los informes sin envoltorio ZIP como archivos ZIP y no pudo extraerlos; se recuperaron como JSON directo por la API de artefactos, sin cambiar el workflow. No se preservan credenciales ni URLs firmadas. No acredita navegador web oculto, Pixel físico, escucha/RAM ni campaña renderizada completa.

Esta Action precede a c8d48c9/da41ed8. Los cambios recientes de registro de origen y QA de profundidad tienen sus propias pruebas y requieren la siguiente CI; no se atribuye esta aceptación Windows a esos SHAs posteriores. El juego no se ha publicado en itch.io.
