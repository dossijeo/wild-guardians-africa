# f-R4: identidad de los recursos del mundo confirmado

Continuación de `95d3198d1`. **f-R4 parcial; no se cierra A6 ni se habilitan
personajes autónomos de producto.** Sigue vigente el criterio completo de
[A6-CHECKLIST](A6-CHECKLIST.md): recursos y dibujo de la misma mutación física,
con personajes reales y preparación bloqueada.

## Brecha corregida

El dibujante asignaba `nativeMutationEpoch` al recibir un mensaje por el puerto
de recursos. Un frame preparado antes del commit pero enviado después recibía
la época nueva aunque conservase los recursos anteriores. Descartar solo los
frames que ya estaban esperando en el consumidor no cubría esa secuencia.

El bridge conserva ahora una identidad del último commit efectivo:
`version, authorityEpoch, nativeSession, ticket, effectiveTime`. Son datos de la
propuesta nativa, no posiciones, un permiso de tiempo ni un contador de recepción
del renderer. Un intento bloqueado/cancelado no los cambia. El baseline de un
nuevo consumidor conserva esa identidad dentro de la misma autoridad; otra
sesión/época no puede reutilizarla. La identidad no se guarda como handle durable.

La liberación de un hold con commit exige esa identidad y la entrega al
dibujante. Este comunica la identidad requerida al preparador por su puerto
existente. La API `requiredNativeWorldBoundary()` solo la consulta: no etiqueta
automáticamente los recursos. El propietario de preparación debe aplicar el
mundo correspondiente y entregar `nativeWorldBoundary` al abrir el frame.

Antes de admitir, tras las esperas de recursos/control y antes de dibujar se
comprueba la identidad. Una etiqueta ausente/antigua no resucita el paquete.
`endFrame` tampoco permite convertir un frame abierto para otro mundo. Los
command buffers capturan la identidad al crearse: envolver comandos antiguos
en un frame nuevo o enviarlos directamente fuera del frame no concede permiso
de dibujo. Las copias/diagnósticos sin pase de render conservan sus contratos de
recursos y de drenaje existentes.

Un consumidor configurado con control nativo espera su baseline antes de
presentar. Si ya recibió un frame que no corresponde a ese mundo, lo rechaza
sin mostrárselo al jugador. Los envíos directos al canvas tampoco eluden esa
espera. La generación anterior permanece detenida tras una mutación hasta
disponer de recursos admitidos con la identidad correcta.

## Evidencia y reproducción

[Recibo WASM/WebGPU real](performance/native-world-resources-20261113.json):
preparación síncrona bloqueada durante 500 ms, commit nativo de residencia a
10,25 s, paquete antiguo abierto antes del commit y enviado después, rechazo
de ese paquete y publicación de la generación 3 con la identidad del commit.
Solo se admiten los paquetes 1 y 3. El readback GPU de la sustitución muestra
10,25 s, sin exceder la ejecución nativa; cero errores de validación GPU o
excepciones de página. La consola conserva un 404 sin URL atribuida, como en el
harness anterior; no se presenta como aprobación global de recursos.

Se reutilizan `native-world-mutations.html` y el preparador/dibujante existentes.
La mutación añade un chunk fuera de la vista de este diagnóstico; el triángulo
conserva su ruta. Esta prueba acredita identidad y sustitución, **no** aplicación
visible de la geometría mutada, materiales, personajes ni aceptación artística.

```powershell
# Vite en 5181; PLAYWRIGHT_MODULE apunta a la instalación externa de Playwright.
$env:QA_AUDIT='resources'
.cache/tooling/node20.exe tools/guardian/audit_native_control_lifecycle.mjs
.cache/tooling/node20.exe --test tests/native-world-resource-evidence.test.js
```

La selección de regresión incorpora el contrato puro, publicaciones, cohort,
autoridad, propuestas nativas, renderer remoto, cliente/host y motores de puerta.
Las pruebas verifican también llegada tardía, retagging, comandos fuera de frame,
espera del primer baseline y conservación del ticket entre consumidores. Los
recibos locales son `.cache/native-world-boundary-regression.tap` y
`.cache/native-world-boundary-build.log`.

Resultado de la selección: **199 pruebas aprobadas, cero fallos/skips**. Build
de producción con `VITE_WEBGPU_REMOTE_DRAW=true` aprobado en 43,53 s; conserva
los avisos existentes de imports mixtos/chunks grandes. Se repiten también los
seis casos gráficos de f-R2 y el relevo/pérdida/silencio de f-R3, sin sobrescribir
sus recibos históricos. Los resultados locales quedan en
`.cache/native-world-mutations-regression.json` y
`.cache/native-control-lifecycle-resource-boundary.json`.

Regresión del arranque conectado: `auditNativeRuntimeControl()` usa autoridad,
host y Workers gráficos de producto con el fixture de incursión real guardada.
Bootstrap, Shield legal y revocación funcionan; hay 15 dibujos durante un bloqueo
de 500 ms y cero errores capturados. Recibo local:
`.cache/native-product-control-resource-boundary.json`. Ese harness no dibuja
mallas de personajes ni acredita locomoción autónoma; verifica que esperar al
baseline no introduce un bloqueo circular en el arranque existente.

## Siguiente trabajo dentro del mismo ID

Conectar la aplicación del payload canónico del commit a los subsistemas de
preparación existentes y abrir el frame con esa identidad solo después de
admitir todos los recursos afectados. Incluir recuperación y cancelación de una
preparación sustituida, sin aceptar un ACK de protocolo como disponibilidad GPU.
Después probar mutaciones visibles con personajes reales que consuman los
planes nativos, preparación bloqueada, pausa/velocidad y revocación. El paquete
no debe depender de publicaciones periódicas de posición JS. No se reduce el
criterio de f-R4 a la validación de etiquetas de este incremento.
