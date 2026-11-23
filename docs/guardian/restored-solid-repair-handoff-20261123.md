# Curva GPU al restaurar Repair de muro sólido

Continúa la corrección de la frontera Action15 de `9f6bba4229bbc51fb9d2763b9e65de33cfb39230` dentro de A6. La cadencia integrada sigue en C4.

## Dos defectos distintos

1. La admisión fría solo instalaba morph GPU para portones con `from>0`. Una ruina sólida guardada con `from:0` volvía a dos mallas y actualizaciones CPU de posición/normal. Sol confirmó cuatro aumentos de versión en el recibo físico Action15.
2. Usar únicamente el reloj presentado del portón no lo resuelve: el paquete frío permanece en el instante guardado durante READY, y luego los uniformes genéricos conservan ese techo aunque una admisión nativa permita avanzar a otros bindings. La reproducción alojada mantiene 30,85 mientras la autoridad llega a 31,25.

## Corrección

Se reutiliza el armado de cuatro mallas originales de `webgpu-wall-repair.js`, con un único dueño y el uniforme de selección/Despertar de esa raíz. `createWallRepairLayer` consume una edad local; posiciones, normales, materiales y geometrías permanecen residentes durante la curva. Al finalizar se utiliza la sustitución y retirada diferida del slot existente.

La autoridad captura una vez las curvas sólidas activas en el estado frío autorizado y las declara por el `IntentBaseline` existente. El mirror de control valida época, entidad, material, HP máximo, evento y momento de restauración. Solo esa declaración permite al Host admitir el binding local. No se crea una operación kind2, un recibo de mutación, otro reloj ni un gestor de recursos.

La cobertura del paquete se acota a `event.at + 0.48`. El reloj causal directo, la pausa, la frontera del mundo, las revocaciones y el retiro siguen limitando el envío. El escalar local se satura a 480 ms. Los uniformes genéricos conservan el techo original del paquete. La admisión resuelve la declaración una vez y cada fotograma recorre los bindings ya admitidos.

Godot 4.4 aplica la pose guardada al hacer seek con actualización de delta cero. Three r180 ajusta sus acciones al tiempo indicado antes de actualizar el mezclador. Wild Guardians usa esa separación entre posición inicial y avance en el binding de Repair que ya usa el renderer. [Godot AnimationPlayer](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_player.cpp#L597-L631), [Three AnimationMixer](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L682-L704).

## Contrato de inspección

- `wall.nativeGpuRepair.reference`: `{kind:'restored-wall-repair-reference',version:1,entityId,material,maxHp,from,to:1,at}`.
- `wall.nativeGpuRepair.clockNode`: escalar con metadata `nativeRestoredWallRepair`, `semantic:'relative'`, `epoch:at`.
- Testigo `nativeRouteFrame.bindings`: referencia anterior, `declaration:{version:1,authorityEpoch,restoredAt,reference}`, `semantic`, `epoch`, `relativeTime` realmente escrito y `elapsed:at+relativeTime`.
- El frame añade `authorityEpoch` para comprobar el testigo incluso antes de la primera frontera física.
- Picking: `captureNativeRoutePickFrame(consumer).getRestoredWallRepairElapsed(reference)`.

Compatibilidad explícita: el Draw anuncia `nativeRestoredWallRepairVersion:1`. Sin esa capacidad o sin una declaración válida, la restauración no adquiere permiso y falla explícitamente; no vuelve a morph CPU. Las partidas no necesitan otro formato ni otro WASM. No cambia la política de los portones ni las admisiones existentes.

## Ejecución tras integrar

```powershell
.cache/tooling/node20.exe --test tests/restored-wall-repair-clock.test.mjs tests/native-gate-repair-morph.test.js tests/native-route-control.test.js
.cache/tooling/node20.exe --test --test-name-pattern='hosted cold Repair|restored terminal Repair' tests/native-production-lifecycle.test.js
.cache/tooling/node20.exe --test --test-name-pattern='clock|Clock|Repair|native.*frame|native.*binding' tests/remote-webgpu.test.js tests/native-route-pick-frame.test.js tests/native-ruined-wall-repair-clock.test.js
```

El laboratorio reutiliza `terminalRepairSave` y los módulos Worker/Host existentes. Genera guardados públicos a ambos lados del cruce de parejas (50/100 ms), retiene READY de Action15 e Idle, pausa, observa el buffer realmente ligado a cada envío —incluidos forks— y exige continuidad, saldo y cuerpo conservados. El guardado real v1 también puede seleccionarse:

```powershell
$env:QA_TERMINAL_REPAIR_RECEIPT=(Resolve-Path .cache/native-ruined-solid-wall-disk-save-early-20261123.json).Path
.cache/tooling/node20.exe --test --test-name-pattern='hosted cold Repair 0.1 |restored terminal Repair' tests/native-production-lifecycle.test.js
Remove-Item Env:QA_TERMINAL_REPAIR_RECEIPT
```

El ensayo de 50 ms genera su propio guardado: no ejecutar ese caso con la variable apuntando al v1 de 100 ms.

## Evidencia obtenida

- 35 controles gráficos, ocho de control causal y cuatro de declaración/picking: verdes.
- Tres nuevos controles alojados: edades 50/100 ms con ambos READY, y paquete sin binding que conserva exactamente su techo.
- 39 regresiones dirigidas adicionales verdes; 135 casos no seleccionados. No es una suite completa.
- Continuación anterior Action15→Idle verde con el guardado generado y el mismo recibo v1 físico. El v1 da edad inicial `0.099999994`, final `0.479999989`, pausa `0.149999991`, tres buffers físicos y techo global `30.849998474`.
- Negativo gráfico anterior: los 11 primeros controles nuevos fallan con la vía CPU. Negativo causal: al eliminar únicamente la declaración del baseline, el primer paquete con binding local se rechaza por falta de autorización. Referencias de otra época/entidad/evento, permisos mezclados, cobertura arbitraria y testigos alterados se rechazan.
- Cancelación antes de publicación, fin de preparación tardío y sustitución final rechazada conservan propiedad y retiro. Destruir un candidato con alias ajeno no destruye la geometría del otro propietario.

Estos ensayos usan WASM real, shaders de Three r180 y una cola GPU doble. El control alojado también retiene Action15 READY antes de que empiece a avanzar la curva.

Los ensayos privados están en `.cache/restored-clock-*`, `.cache/solid-restore-*` y `.cache/restored-repair-cold-clock-*`. El primer observador privado elegía el último buffer creado (candidato no presentado); el definitivo observa los buffers ligados a los envíos. Otro montaje reutilizaba el lease frío al preparar Idle; se corrigió la metadata de ese candidato, manteniendo el techo del paquete anterior. Un intento de combinar referencia ajena y cancelación chocó antes con backpressure/frontera; el rechazo de identidad se prueba directamente en el dueño de admisión y el caso alojado sin binding se mantiene separado.

## Validación física integrada

Los dos guardados restauraron las cuatro mallas en Edge 158 con NVIDIA GTX 1660, resolución del canvas 640×480 y pantalla a 30 Hz. El v1 procede del guardado físico original a 100 ms. El coordinador público generó el v2 a 50 ms con WASM real y un doble de GPU. Ambas recargas usaron el Worker de autoridad, el runtime alojado y el Draw Worker de producción con la NVIDIA. La edad observada por picking coincidió con el escalar enviado en los ocho bindings iniciales. Se conservó la edad durante la pausa y el reloj genérico quedó en el instante guardado mientras el reloj local avanzó hasta 480 ms. El v2 dibujó a ambos lados del cambio de pareja, situado a 99,02 ms. El v1 partió de la segunda pareja.

| Guardado | Dibujos observados del paquete al reanudar | Buffers residentes comparables reutilizados | Mayor intervalo de dibujo del ensayo |
| --- | ---: | ---: | ---: |
| v1, 100 ms | 12 | 728 de 728 | 37,80 ms |
| v2, 50 ms | 16 | 1047 de 1047 | 36,90 ms |

En ambos casos se conservó la raíz del muro hasta la malla sana y siguieron residentes las posiciones, normales y atributos del morph durante la curva. El reparador volvió a Idle con el cuerpo 1, el saldo guardado de 99 990 se conservó, hubo un solo `RepairApplied` y el consumidor drenó sin errores. La reparación llegó a su edad final antes de adquirir Action15. La notificación READY llegó después del fin de la curva en los dos ensayos físicos. La prueba alojada cubre la retención en el orden inverso. [Recibos, muestras y hashes](performance/native-restored-solid-repair-20261123.json).

El primer intento mantuvo la partida pausada mientras esperaba Action15. Dibujó el estado guardado a 100 ms antes de que el cliente reportara `Worker command not admitted: failed`. El recibo no capturó el primer error de la autoridad. Los ensayos concluyentes reanudaron después de verificar la pausa y registraron la llegada de READY.

En las capturas a 30 Hz, 337 de 337 intervalos del v1 y 341 de 341 del v2 superaron el objetivo de 16,67 ms. Dentro del avance de la curva se observaron máximos de 37,40 y 36,10 ms, respectivamente. Estas cifras miden inicios de dibujo del Host. Las trazas Dawn se conservaron sin pérdida y la atribución de los intervalos continúa en C4.

El intervalo de arranque de 37,80 ms del v1 contiene `WebGPUMailboxTexture::FromStaticBitmapImage` en el hilo de Draw. La llamada duró 36,713 ms de pared y 5,828 ms de CPU. Dentro de ella, `RasterImplementation::WritePixels` duró 36,695 ms de pared y 5,813 ms de CPU. Queda por identificar la textura y su productor en el juego. El código de Chromium usa este paso al importar el bitmap para copiarlo a la textura WebGPU. [Código de la importación en Chromium](https://chromium.googlesource.com/chromium/src/+/cf08193aded4f1e8fe801eb2902ec162f6fedd84/third_party/blink/renderer/modules/webgpu/gpu_queue.cc#733).

Pasaron las 88 pruebas focales, las 505 de la selección ampliada de 44 archivos y el build de producto WebGPU Worker con Draw remoto. Las 17 postimágenes del candidato se verificaron antes de actualizar la documentación. Se reutilizaron los binarios WASM canónicos.
