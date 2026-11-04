# Recuperación QA de presentación WebGPU

La opción QA conserva un checkpoint de presentación candidato y solo lo reconoce como base tras el ACK exacto del Worker gráfico. Un journal acotado retiene, desde esa frontera, las publicaciones completas y sus eventos, poses e invalidaciones, así como los lotes de terreno previos a cada publicación. El replay envía el checkpoint sin volver a emitir sus eventos y entrega después cada lote de terreno y publicación en orden, esperando un ACK con sesión, identificador, fase y secuencia antes del siguiente. Las publicaciones siguen guardando sus fronteras originales: este mecanismo no consolida snapshots por tick.

La admisión de simulación se detiene durante el reenganche QA. El presupuesto usa límites configurables de entradas y una estimación de bytes; la sobrecarga real del heap y las copias temporales no están incluidas exactamente. No existe todavía renovación automática de checkpoint. El journal no está listo para producción ni garantiza funcionamiento prolongado.

La recuperación rechaza un journal con error de canal, candidato pendiente, terreno incompleto, secuencia distinta de la autoridad o saturación. La autoridad permanece detenida ante esos errores y se informa del fallo; no se reengancha silenciosamente con un hueco. La recuperación no constituye rollback físico de la simulación.

## Evidencia

- Prueba real QA WebGPU de sustitución de Worker y canvas: checkpoint 170, replay hasta 197 y continuación hasta 213, con 25 chunks. El intervalo observado estaba pausado y no demuestra por sí solo replay de eventos o poses físicas.
- Una segunda prueba real restauró una pose Rapier activa: base 816 y replay hasta 853. La caída y el impacto eran anteriores a la base; no demuestra replay de un evento posterior.
- Se reprodujo saturación: base 302, through/ACK 430 y 128 entradas, con el canal visual al día pero órdenes y pasos pendientes. Sin renovación, el umbral detiene el despacho e impide ejecutar el checkpoint que permitiría liberar el journal. Esto sigue pendiente.
- Se está comprobando un evento posterior al checkpoint. Hasta completar esa prueba no se afirma que todos los efectos/eventos y su deduplicación estén verificados en juego real.

Pruebas dirigidas reproducibles con Node 20 del repositorio:

```powershell
.\.cache\tooling\node20.exe --test tests/presentation-recovery-journal.test.js tests/presentation-recovery-replay.test.js tests/visual-publication-stream.test.js tests/host-publication-queue.test.js
```

34 pruebas pasaron tras añadir las guardas fail-closed. Cubren orden, ACK y cursor, eventos y poses en publicaciones, tandas de terreno, límites, duplicados, journal incompleto y overflow. Son pruebas de contrato; no sustituyen validación visual, rendimiento sostenido o recuperación real tras pérdida de dispositivo.
