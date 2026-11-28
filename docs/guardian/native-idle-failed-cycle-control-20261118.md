# Admisión controlada de REST desde WALK fallido — 2026-11-18

Continuación de `d64eb8ab5`, dentro de A6-04.f-R3/e-R3. Se permite preparar y adquirir 21 desde la solicitud WALK real ligada al cuerpo, y encadenar las continuaciones REST/WATCH nativas. El actor/roster/Surface y su GPU real siguen pendientes. A6/A/B/C no se cierran; D no se inicia.

## Investigación aplicada

Se leyó [Jolt 5.3.0, `BodyManager::TryGetBody`](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyManager.h#L132-L157): verifica el índice, la validez del puntero y la coincidencia del BodyID antes de devolver el cuerpo. También [BodyLockBase](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyLock.h#L14-L67) distingue adquisición fallida y acceso válido. Se adapta esa comprobación de identidad/vigencia al control de un solo propietario ya existente. No se incorporan Jolt, mutexes, nuevos registros o una autoridad física.

El equivalente local ya resuelto para WALK 22 frío es una solicitud pendiente tipada, no un permiso gráfico previo. Se reutilizan `idleStrollRequestCurrent`, la comparación estricta del original y las asociaciones 21 emitidas por la autoridad. No se fabrica un cuerpo 20 ni una llegada 22 para adquirir REST.

## Implementación

- `cyclePreparationSourceMatches` admite el primer `native-idle-stroll-failed-source` solo si su solicitud ORIGINAL coincide exactamente con la pendiente, su actor/época/sesión/secuencia siguen vigentes y la frontera no antecede a su nacimiento. El renderer no consulta ni decide el camino.
- `admitIdleCycle` conserva esa solicitud como origen de la candidatura. Se puede preparar el recurso; el lease todavía no es current ni tiene un registro de reloj de dibujo.
- El evento nativo de adquisición debe coincidir con esa fuente. El 21 emitido sigue separado del 21 instalado: hacen falta control ordenado, reloj vigente y la instalación del recurso preparado antes de que el lease sea current. Cada horizonte físico queda finito.
- Las continuaciones versión 2 admiten REST o WATCH, siempre coincidiendo con el sucesor nativo exacto y con el 21 anterior realmente instalado. La versión 1 conserva sus restricciones. Un nuevo 21 revoca el anterior; un candidato cancelado no cubre otro ticket emitido.
- Una solicitud Home/Task invalida candidaturas pendientes. Un 21 ya instalado conserva su cuerpo durante la preparación del siguiente propietario, pero se corta su executionEnd: no recibe una extensión del presupuesto anterior. Los relojes físico y cosmético enviados se congelan en un corte temprano, conforme al contrato previo.
- Un cuerpo retirado, otra época/actor/destino/cuerpo, un 21 no instalado o una asociación de baseline no pueden suplir los permisos que faltan. No se habilita bootstrap por metadatos.

Solo cambian el control y las pruebas. Los DTO/WASM de `d64eb8ab5` permanecen exactos; no hay rebuild nativo ni cambios de materiales, geometrías, bancos o shader.

## Validación

- **29 pruebas nuevas**, cuatro perfiles normal/pthread; procedencia exacta y negativos de época/cuerpo/actor/destino; entrega de control/reloj separada; cancelación, retirada, baseline, revalidación tardía y continuaciones REST/WATCH. Home/Task cortan el cuerpo instalado sin extenderlo; una candidatura pendiente queda inválida.
- Puertos reales de control y recursos, Host y GPU simulada: adquisición 21 sin 20/22 previos, duración cero/positiva, relojes enviados físico/cosmético y picking emparejados, preparación/quiescencia tardías, paso REST→WATCH y WATCH retenido, cancelación durante preparación, negativas de capacidad/decoder y corte Home. No se presenta como GLB/Surface/GPU real de la fuente nueva.
- **301 dirigidas en 13 archivos**, cero fallos/omisiones; selección amplia de **3131 pasan de 3132 en 268 archivos**, una comparación opcional omitida y cero fallos/cancelaciones. Se conservan las siete exclusiones históricas; no es toda la suite del repositorio. Build correcto en 48.64 s.
- Control anterior en solo lectura: **4 fallos esperados y 25 casos filtrados**. Las primeras sondas conservaron una expectativa incorrecta sobre retirar el cuerpo instalado al pedir Home y otra sobre la etiqueta de cancelación: se corrigieron las pruebas al contrato existente, sin alterar su comportamiento.
- **444 inputs probados / 64 nativos idénticos**; ningún rebuild WASM. 16 archivos ajenos y worker pthread no seguido intactos.
- Regresión NVIDIA real de la ruta **VÁLIDA previa 22→21**: conserva 648/649 IDs inmutables, prepara 100/98 recursos en una llamada por transición, cero tardíos y shaders duplicados. WATCH, clip terminal, selección, adopción y drain pasan.
- Cadencia de esa regresión: ventana de 747 frames, máximo 75.145 ms y 2 intervalos >50 ms; global de 1055 frames, máximo 152.895 ms y 7 intervalos >50 ms. Picos conservados, sin causa atribuida ni aceptación de cadencia.

[Referencias, selección de pruebas, hashes y evidencia GPU](performance/native-idle-failed-cycle-control-validation-20261118.json).

## Límites y siguiente punto

Los ensayos de puertos/Host usan el protocolo real y un dispositivo GPU simulado con buffers y relojes. No construyen el GLB ni el actor original de la partida. Las pruebas de instalación manual son un consumidor de recursos preparado de confianza, no un recibo de hardware. La regresión GPU adicional solo comprueba la ruta válida previa 22→21.

Siguiente: admitir la primera fuente fallida desde el actor residente sin nativeState previo, conservar raíz/mallas/geometrías/bancos en roster/Surface y demostrar el relevo con el actor, picking y GPU reales. También deben comprobarse las fases al relevar REST→REST y WATCH→WATCH tras espera: ver un offset creciente dentro de un 21 no demuestra continuidad visual entre dos 21. No se dará ese gate por cerrado con los buffers de estas pruebas.

Siguen pendientes aproximación 22 con remaining conservado, reanudación del reintento de REST/WATCH exterior guardado, productor ordinario/cohort, recuperación incremental de los 3.123 recursos y aceptación de cadencia/plataforma. La instalación de este control no declara terminada la migración.
