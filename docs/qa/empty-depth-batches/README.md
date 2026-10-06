# Preparación de profundidad de lotes vacíos: candidato no adoptado

Ensayo sobre base `a92cad9`. Un candidato evita preparar materiales de drawRange cero, InstancedMesh.count cero o InstancedBufferGeometry.instanceCount cero, respetando la precedencia de InstancedMesh. Conserva hijos visibles y materiales compartidos mediante sus propietarios no vacíos. Excepciones de callbacks/compile hooks no acreditados, callbacks de escena y overrideMaterial conservan la ruta anterior. No descarta geometría por distancia ni cambia alpha, shader o estado lógico.

**Resultado: experimental y desactivado por defecto.** Se evita trabajo de preparación, pero las comprobaciones de elegibilidad añaden trabajo y las mediciones no acreditan un ahorro consistente. La API final requiere `nonEmptyOnly: true` o el flag explícito QA `nonEmptyDepthOnly=true`; el juego conserva su preparación anterior. No presentar los contadores menores como una mejora de FPS.

## Finca real renderizada

Cuatro continuaciones pagadas A/B/B/A de Manglares/Saheliana, mismos 18 trabajadores, cámara/calidad media/sombras y estado; 350 pasos de 100 ms por lote, últimos 200 medidos. Shader analítico y guardia de alpha originales, sin activar el experimento alpha. Framebuffer 1600×900, Intel UHD/D3D11. 800 queries completas, sin disjoint, pérdida de contexto, descartes o queries pendientes/ajenas.

| Lote | Omite vacíos | CPU render mediana (ms) | GPU mediana (ms) | RAF mediano (ms) |
| --- | --- | ---: | ---: | ---: |
| A1 | No | 40,45 | 61,3835 | 66,65 |
| B1 | Sí | 42,50 | 60,7375 | 65,85 |
| B2 | Sí | 42,90 | 60,7868 | 65,35 |
| A2 | No | 46,90 | 60,6764 | 75,05 |

El primer par aumenta CPU y el segundo la reduce; GPU varía poco. Hay deriva entre originales y no se acredita ganancia consistente/general. Se omiten **575 lotes vacíos por frame** en los lotes B: fallback 867→292, manteniendo los contadores specialized/excluded por cada paso. Estos contadores son preparación, no envíos. Las llamadas y triángulos enviados coinciden exactamente por paso en todos los lotes (medianas 637 llamadas/5.135.701 triángulos con pases sumados).

Coinciden también 89 búsquedas de ruta, 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes de cosecha. Hash final `c6cd4533687b41c35d494e322c8f82ab0e613544819fe0f8d7c1ded224300fdd`, saldo 841, 186 plantas vivas a 35 s. No acredita campañas de cien noches, móvil, memoria en bytes, audio/HUD/autosaves/incursiones ni todos los biomas.

## CPU aislada y lectura de profundidad

Una escena nativa pausada Manglares/Mapungubwe, semilla 712, un trabajador real en llegada y primer mijo. Sin invocar draw: se mide selección/toggling/restauración de materiales sobre la escena real. Por lote: 20 llamadas de calentamiento y 20 muestras de 25 llamadas; se conservan muestras completas y se verifica estado lógico/materiales sin cambios.

| Lote | Mediana de 25 preparaciones (ms) | Vacíos omitidos |
| --- | ---: | ---: |
| A1 | 10,65 | 0 |
| B1 | 10,15 | 583 |
| B2 | 9,95 | 583 |
| A2 | 8,60 | 0 |

Tampoco mejora de manera consistente: primer par −0,50 ms, segundo +1,35 ms por 25 llamadas. Esta prueba excluye GPU, dibujo y VFX real, y no mide FPS. El candidato no se activa basándose en una reducción de contadores.

La finca compara RGBA en cinco renders A/A/B/B/A, sin avance lógico. Diferencias de color por pares: 31/34/18/40/18 píxeles, máximo de canal 35; existen diferencias entre originales y no se atribuye toda variación al candidato. Dos escenas pausadas adicionales, edificio intacto y colapso visual controlado del 85 %, comparan attachment real de profundidad empaquetado y color final en 1.440.000 píxeles por par. **Profundidad idéntica en los diez pares**, no constante; estado lógico preservado, sin errores WebGL/escena/consola. Color sigue presentando pequeñas diferencias también en controles originales. No demuestra equivalencia general ni la causa de esas variaciones.

Pasan **22 pruebas dirigidas** de captura, profundidad stock y sombras nativas, incluyendo guardia final desactivada por defecto, restauración tras error, propietarios compartidos, hijos y precedencia de counts. Build final aprobado; persiste el aviso de bundle mayor de 500 kB.

[Datos nativos](native.json.gz), [CPU aislada](cpu-mangrove-mapungubwe.json), [hashes](proof.json) y capturas/JSON estáticos en esta carpeta. Se conserva gzip mtime cero y hashes de bytes originales/comprimidos. `executed-runtime.patch` reconstruye la variante ejecutada desde la base; los hashes distinguen sus fuentes de la versión final, cuyo cambio es dejar el flag apagado y añadir su prueba de regresión. Ningún resultado de este ensayo se presenta como optimización aplicada al gameplay.

Pendiente: una integración alpha sin segundo recorrido de escena, repetibilidad de color y coste GPU del dibujo final. No continuar profundizando en este filtro de vacíos sin una hipótesis nueva que justifique su coste.
