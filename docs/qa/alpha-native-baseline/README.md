# Alpha frente a profundidad nativa completa

Sobre `e263b11`, se añade al visor una comparación de **tres rutas**: N conserva todos los shaders nativos; G es la salvaguarda de producción actual; B activa únicamente el candidato alpha dentro del recorrido existente. La comparación anterior G/B no bastaba por sí sola para comprobar el contraejemplo histórico, que enfrentaba la ruta nativa completa con la especialización.

Seis renders N1/N2/G/B1/B2/N3 con simulación pausada, sin cambios de cámara entre lecturas. Siete pares: N1/N2, N2/G, G/B1, N2/B1, B1/B2, B2/N3 y N2/N3. Cada frame registra flags y estadísticas efectivamente usadas. Se lee color final y el attachment real de profundidad empaquetado a RGBA8; se rechaza profundidad constante y cambios lógicos. Se restaura la configuración al finalizar. No se modifica el comportamiento de producción.

| Escena semilla 712, media | Profundidad en siete pares | Color en el orden de pares indicado |
| --- | --- | --- |
| Manglares/Mapungubwe intacto | 0 en todos | 19 · 6 · 5 · 11 · 20 · 26 · 17 |
| Manglares/Mapungubwe colapso visual 85 % | 0 en todos | 32 · 27 · 23 · 20 · 1 · 6 · 25 |
| Mismo colapso, cámara girada 90° | 0 en todos | 21 · 17 · 50 · 67 · 57 · 45 · 55 |
| Gran Cañón/Mapungubwe intacto | 0 en todos | 0 · 0 · 0 · 0 · 0 · 0 · 0 |

**28 pares** de 1.440.000 píxeles con profundidad no constante, sin errores ni cambios lógicos. Un trabajador real cargado en estado `arriving`, primer mijo a crecimiento cero; sin incursión/VFX de trabajo activo. Colapso y giro son entradas controladas de QA. El horizonte del Gran Cañón utiliza su material y recorte nativos. Los contadores demuestran que N no especializa, G mantiene alpha nativo y B acepta candidatos alpha; no se confunden con draw calls.

La diferencia histórica de 14 píxeles **no se reproduce en estas escenas actuales**. Esto no identifica su causa ni prueba que todas las diferencias posibles estén corregidas: fuentes, población renderizada y guardas han cambiado desde aquella captura. Se conserva el [contraejemplo original](../../qa-standard-depth.md). No se retira la salvaguarda ni se presenta el candidato como aceptado universalmente.

El color de Manglares también cambia entre N/N y B/B con el reloj fijo; causa sin aislar. El máximo observado es 74 niveles de canal en unos pocos píxeles del caso intacto. Gran Cañón sí coincide exactamente en esta vista. No se atribuye toda variación a alpha ni se declara igualdad global a partir del caso coincidente. No hay benchmark GPU/CPU nuevo en estas lecturas.

Pendiente: explicar variación de color, ampliar poses/crecimiento/efectos que consumen profundidad/biomas/culturas/móvil y reducir el sobrecoste CPU de preparación ya medido. El candidato sigue apagado por defecto. Las 26 pruebas y build del commit base validan el runtime sin cambios; este commit añade únicamente visor/evidencia/documentación, ejercitados en navegador nativo.

[Escena intacta](mangrove-intact.json), [colapso](mangrove-collapse.json), [giro](mangrove-collapse-side.json), [Gran Cañón](canyon-intact.json), [captura](canyon-intact.png) y [hashes de fuentes/datos](proof.json).
