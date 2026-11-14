# Plantillas físicas de centros desde autoría — QA

`qa-worker-authored-centers` activa en desarrollo una ruta reversible: el Worker de simulación carga `content/worker-center-templates.json` en vez de recibir las cajas capturadas desde `WorldScene`. Sin el flag se mantiene la ruta anterior. El manifiesto de unos 6 KB contiene para las cinco culturas la escala y las cuatro cajas que captura `NativeBuilding`: ceniza, cuerpo exterior, cuerpo interior y escombros, incluso cuando un mesh no es visible. La física de Rapier y las reglas de colisión no cambian.

Las plantillas se generan con la implementación de producción de `NativeBuilding` y sus datos DEST, sin texturas. El generador compara los GLB originales y los GLB comprimidos realmente servidos; si sus cajas difieren, falla. El Worker contrasta el hash de los parámetros de autoría y las identidades/hash del manifiesto de assets antes de habilitar la física. Si el archivo falta o no corresponde, falla cerrado; quitar el flag recupera la ruta previa. El Worker no descarga el GLB ni ejecuta la preparación de destrucción al arrancar.

La prueba de Node reconstruye los cinco modelos originales y comprimidos, compara todas las cajas y matrices con el manifiesto y comprueba rotaciones; comprueba también hashes de GLB y archivos de implementación. Por tanto, un cambio de geometría, descriptor o implementación invalida reproduciblemente esa prueba y exige regenerar. La validación de arranque **no vuelve a descargar ni verifica los bytes del GLB ni las fuentes JS**: una modificación local que no actualice los manifiestos se detecta en la prueba de Node, no automáticamente en el cliente. Mantener esta prueba en CI es necesario antes de utilizar la opción fuera de QA.

La fixture de navegador ejecutó dos Workers de autoridad y Rapier junto a un centro intacto mapungubwe: 100 intervalos, 96 con pose física activa y snapshots/eventos/poses idénticos. El grupo de referencia recibe las mismas cajas que produce la captura original, no construye `WorldScene`; las otras culturas y orientaciones se verificaron geométricamente en Node. No se ha probado la ruta con partida real, edificios dañados, cambios de cultura, todos los tipos de impacto ni se ha medido su rendimiento.

Generación y comprobación:

```powershell
.\.cache\tooling\node20.exe .\tools\experiments\generate_worker_center_templates.mjs
.\.cache\tooling\node20.exe --test tests/authored-center-templates.test.js tests/worker-structure-geometry.test.js tests/simulation-authority-client.test.js
```

Fixture Rapier, con Vite activo en una terminal:

```powershell
.\.cache\tooling\node20.exe .\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5192 --strictPort
```

En otra terminal:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
.\.cache\tooling\node20.exe .\tools\experiments\audit_authority_authored_centers.mjs
```

`QA_BASE_URL` y `PLAYWRIGHT_MODULE` permiten elegir otra URL o instalación. Cerrar Vite al terminar.
