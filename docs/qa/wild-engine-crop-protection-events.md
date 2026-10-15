# Wild Engine: avisos de protección agrícola

Rama experimental: `codex/wild-engine-event-intents`. Los datos siguientes proceden de Sabana/Mapungubwe, semilla 712, campaña nativa de tres jornadas, con el mismo WASM y la misma política económica. No son una validación de cien noches.

El puente de Wild Engine recibe eventos confirmados de cultivos, estructuras y entregas. Cuando cambia la topología o la residencia de sectores, la sesión espacial emite una notificación. El puente vuelve a consultar la clasificación nativa de grupos únicamente por estos eventos y comunica al consumidor `crop-group-unprotected` cuando el grafo demuestra que un grupo ha pasado a estar expuesto. Un resultado `unknown` no se transforma en `unprotected`. La identificación de una agrupación puede cambiar al cosechar su planta representante; el puente compara también los miembros previos para evitar avisos falsos por ese cambio de ID.

El jugador virtual conserva el plan de recinto y su objetivo de ahorro. No consulta la revisión física cada 30 segundos. Reacciona a grupos expuestos, cambios topológicos o de sectores, daños, ingresos confirmados y amaneceres. Un ingreso permite comprobar si ya puede pagarse un plan **completo y certificado**; no vuelve a planificar su geometría. La cosecha y replantación ordinarias no invalidan el plan. La restauración de una partida reconstruye el índice y avisa a los consumidores. Ninguna propuesta especulativa comunica un cambio de la topología confirmada.

| Medición de la defensa | Versión con consulta periódica | Versión dirigida por eventos |
| --- | ---: | ---: |
| Día 2: tiempo de `defense.act` | ~18,7 s | ~19,1 s |
| Día 3: tiempo de `defense.act` | ~18,3 s | 0,0026 s |
| Certificaciones de recinto ejecutadas, días 2–3 | 2 | 1 |
| Recalificaciones nativas de grupos, días 1–3 | No instrumentado | 172; 1,63 s |
| Avisos de transición de protección | No disponible | 4 |

El plan inicial del día 2 sigue siendo `unknown` por `uncertified-topology` y una posición con `physical-obstacle`. Su certificación inicial consume ~18,5 s y no justifica una compra. El bot no construyó fragmentos ni declaró protegido ese grupo. Esta es una limitación del planificador de recintos que requiere un experimento separado; la conversión a eventos elimina las repeticiones temporales, pero no resuelve todavía la propuesta inicial ni prueba ventaja militar de la defensa.

Las cosechas y destrucciones de cultivos actualizan el índice nativo, pero no recalifican la protección: retirar una planta no abre una barrera física ni puede empeorar el estado protector de las plantas restantes. Una nueva plantación sí puede crear o conectar un grupo expuesto y despierta una clasificación. Esta distinción redujo las consultas por eventos de 298 a 172 en el mismo piloto.

Comprobaciones ejecutadas: pruebas nativas de grupos, brecha y transición de protección; pruebas del puente de intenciones; prueba de 100 ticks sin consultas de protección; prueba de política de defensa que despierta solo por avisos; build web. Las pruebas de campaña larga y de recintos variados quedan pendientes antes de integrar esta rama.
