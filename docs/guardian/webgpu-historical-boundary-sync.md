# Hook experimental de sublímites históricos

La superficie WebGPU expone al stream temporal `onHistoricalBoundary({sequence,at,events},changedKeys)`. El stream debe aplicar antes el estado intermedio y llevar el reloj visual exactamente a `at`. El hook rechaza estados, relojes o eventos desincronizados y actualiza iluminación, contactos de edificios, rosters, cultivos, construcciones y VFX con los eventos de ese sublímite. Para el guardián reconstruye las referencias del journal v2 en orden. Los deltas silenciosos con `events=[]` actualizan los participantes sin generar lifecycle. Los cambios nocturnos actualizan también el estado visual de la cobertura lejana, sin confirmar una revisión externa.

El hook no confirma terreno, no publica una nueva secuencia externa, no emite ACK ni notifica `onConfirmed`. El stream debe evitar reenviar en el límite exterior los eventos y referencias ya aplicados. La certificación de que no cambiaron terreno ni física, la coherencia de poses y la integración completa del stream son responsabilidades pendientes; el hook por sí solo no habilita reproducción histórica en producto.

Pruebas contractuales: `node --test tests/webgpu-historical-boundary-sync.test.js`. No constituyen una validación de Worker, física o WebGPU reales.
