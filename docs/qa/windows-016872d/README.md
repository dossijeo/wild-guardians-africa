# Windows: compilación y pruebas nativas de 016872d

[Build Windows desktop 37570888153](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37570888153) terminó correctamente sobre `016872d74915bb18d31471b112c089f9e2e54c5c`. `run.json` conserva los pasos y SHA; `windows.log.gz` conserva la salida completa; `result.json` conserva hashes de los informes originales y el inventario de artefactos.

Se generaron el ejecutable de 327649280 bytes y el instalador de 325204660 bytes. El smoke de WebView2 registra menú local, WebGL2, worker, storage, audio Opus decodificado a 44100 Hz / dos canales / 12 segundos, veinte rutas GLB y mundo Gran Cañón/Mapungubwe de 1028 × 720, sin errores registrados. No prueba por sí solo todas las animaciones, modelos visibles, sonidos ni culturas.

El informe de minimización nativa registra 300177,1 ms ocultos. Las proyecciones comprobadas del estado al principio y final coinciden exactamente; al restaurar se conserva la pausa de menú y, tras cerrarla, avanza 1,1 segundos. El contrato exige avance positivo dentro del tiempo visible, sin recuperar los cinco minutos ocultos; la proyección excluye metadatos de guardado y presentación según el informe. Los dos JSON originales se conservan comprimidos, con SHA-256 previo a compresión.

Los endpoints de artefactos devolvieron los JSON directamente y se preservaron esos bytes, sin tratarlos como ZIP. Esta prueba corresponde al commit indicado: no acredita HEAD posterior ni pantalla encendida en Pixel/Chrome/itch.io. Validate Game de ese mismo commit tuvo un fallo de expectativa de routing para SFX 043/046, corregido después y documentado en `../browser-script-syntax` y `../validation-bc2f0aa`; no se atribuye éxito de ambos workflows a 016872d.
