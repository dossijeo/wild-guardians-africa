# Primeras dos campañas completas de la matriz optimizada

Los dos procesos iniciados con los hashes de `0a0d1c5` terminaron con código 0 y victoria después de cien noches. Sus estados, informes, resúmenes y procedencia se conservan en `intensive-first-two-100/`. Ambas partidas usaron semilla 712, olderFemale, cultivos mixtos y comandos normales de plantación, contratación, magia, reparación, riego, recogida y entrega física. No se cambiaron dinero, crecimiento, daño ni RNG.

| Mundo | Saldo final | Máximo de plantas vivas | Especies plantadas | Tiempo diurno sin acciones |
| --- | ---: | ---: | ---: | ---: |
| Sabana/Mapungubwe | 992 | 282 | 8 | 57,25 % |
| Sabana/Saheliana | 937 | 319 | 8 | 60,52 % |

La auditoría de cada proceso comprueba dinero entero, semillas pagadas, riegos obligatorios, cajas recogidas por trabajadores, cargos por entrega, ausencia de duplicados y round-trip del snapshot. Cada jornada tiene plantilla y entregas físicas. Una victoria exige día 101, cien noches, ningún animal pendiente, un evento CampaignWon y ningún GameOver.

El estado completo Mapungubwe coincide con el guardado de la ejecución mixta anterior: SHA-256 `36aed66e57f7910c13134651c30e0e0edf90fd06f06a2188a66723a07fdb56b7`, ignorando únicamente el salto final del archivo. `mapungubwe-state-reference.json` apunta a ese archivo compartido para evitar duplicarlo. Esta igualdad prueba la conservación del estado de cien noches al optimizar el trabajo sobre historiales; no identifica retrospectivamente el commit de arranque de la ejecución antigua, que carece de cabecera.

Estos resultados pertenecen a sus fuentes registradas y preceden a la corrección de tráfico de animales. No verifican retrospectivamente la versión posterior. La matriz continúa y ya detectó el atasco real de Sabana/Musgum en la noche 32, documentado en `raid-musgum-deadlock.md`; no se marca como éxito ni se elimina del registro. Los procesos posteriores guardan sus hashes propios y la matriz global conserva `campaign100:unverified` cuando difieren sus fuentes o falta una combinación. La supervivencia de dos mundos tampoco acredita el balance de todos los cultivos ni un ritmo satisfactorio.
