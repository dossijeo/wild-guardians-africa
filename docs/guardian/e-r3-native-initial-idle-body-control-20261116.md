# Cuerpo inicial en el control directo existente

Continúa la [fuente del cuerpo inicial retenido](e-r3-native-initial-idle-body-source-20261116.md). El registro gráfico de actores puede validar esa asociación mediante la petición, el evento de adquisición y el reloj entregados por la autoridad nativa. La preparación sola sigue sin conceder permiso. Faltan todavía el transactor por puertos y el consumidor preparado de la familia 20.

## Referencias y adaptación

Se contrastó el código real de [ObjectStorage en Dawn](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ObjectStorage.h): separa reserva y objeto disponible, y FillReservationImpl comprueba estado y generación antes de sustituir el primero. Se conserva esa separación entre datos pendientes y asociación válida.

Se revisaron también ActorContext, proofLeaseCurrent e installSettlements de nuestro control existente antes de ampliarlos. Se reutilizan su registro por actor, su secuencia directa, su reloj y la conservación de registros capturados. No se introduce otro propietario, temporizador, modelo de movimiento o biblioteca.

## Cambio y validación

El control conserva la petición inicial al recibir su evento nativo de adquisición. La instalación comprueba fuente exacta, cuerpo, sesión, secuencia y frontera actual, además de la marca causal. Un evento con datos de una tarea competidora se rechaza antes de avanzar el cursor. Los lotes inválidos o duplicados no instalan parcialmente sus asociaciones.

Una referencia preparada puede conservar su identidad cuando la autoridad revalida la propuesta; el permiso obtiene el origen real de la asociación instalada. La comparación de la prueba inmutable se conserva mediante el mecanismo existente. La lectura posterior consulta el mismo registro y sus límites.

Las peticiones genuinas de tarea o Home conservan ese registro mientras el cuerpo sigue retenido, incluso si se producen inmediatamente antes de instalar la asociación gráfica. Home debe conservar exactamente la pose y el cuerpo iniciales. TaskStart debe conservar el cuerpo tanto al preparar como al instalar su sucesor. La asignación ejecutable, retirada física, reinicio de cuerpos o cierre del control revocan el registro anterior; no resucitan su petición.

Las trece pruebas nuevas usan eventos y relojes nativos reales, con commits de fuente mediante ABI de confianza. Cubren descanso/vigilancia, revalidación mientras avanza otro trabajador, petición inmediata de tarea/Home, retraso de la marca causal, entradas incompatibles, duplicación, revocación y restauración histórica rechazada. La prueba de Host usa su implementación real con cola GPU simulada y comprueba cero envíos al rechazar el baseline activo.

Los resultados de regresión de las clases que comparten el control, compilación de producto y preservación de cambios previos figuran en [la validación](performance/native-initial-idle-body-control-validation-20261116.json). Los dos módulos nativos y sus fuentes compiladas permanecen sin cambios respecto a la fuente anterior.

No se anuncia todavía la familia 20 como admisión gráfica disponible ni se retira el bloqueo del bootstrap histórico. No hay medición de hardware o recursos GPU nuevos. Siguen pendientes el consumidor preparado con fase original Idle/Alert, la política completa, productor ordinario, otras clases y puertas, nacimiento en vivo, sustitución de mundo y recuperación incremental de los 3123 recursos sanos. No cambia ningún cierre A6/A/B/C ni el orden del plan.
