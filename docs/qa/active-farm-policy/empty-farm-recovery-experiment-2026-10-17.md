# Recuperación agrícola tras perder todos los cultivos — experimento negativo

Estado: **no propuesto para integración**. Este prototipo cambia únicamente la política del jugador virtual en `tools/native-campaign-runner.mjs`; no modifica reglas del juego, daño, salarios, precios ni navegación. Base: `main` en `1629175296e0d171b40d9401475c34d52a9f8512`.

## Causa observada en el control

Sabana, semilla 712, política `good`, ejecución continua (`reloadRaids=false`). Al comenzar el día 31, el estado guardado tenía 164 monedas, un centro intacto con 318/600 HP, un trabajador, cero cultivos vivos y cero tareas de reparación. La contratación redujo la caja a 134. Antes de sembrar, el bot solicitó una reparación y reservó 104 monedas para ella. Su comprobación de siembra exigía además 30 monedas de reserva laboral y 5 para la semilla: 134 < 104 + 30 + 5. Por tanto, rechazó la siembra durante el día 31. La traza de decisiones registra 280 decisiones diurnas con motivo `budget` ese día.

La reproducción dirigida está en [late-planting-diagnostic-sabana712.zip](late-planting-diagnostic-sabana712.zip), SHA-256 `f8f0eb66a29cfdecc1560c573c6c2af4723119f31452ce264bcdf0f510b33865`. Contiene el estado al empezar los días 31 y 32 y un informe con decisiones y filas diarias. El control completo está documentado en la PR #86; registró derrota en la fila del día 32 (`completedNights=31`).

## Prototipo

Cuando, desde el día 6, quedan menos cultivos vivos que el objetivo existente de `plantsPerWorker`, el bot intenta sembrar antes de solicitar reparaciones. Para esa siembra conserva la reserva laboral, pero no aparta anticipadamente caja para reparaciones, defensas o expansión. Las compras pasan por `Game.plant` y su control normal de permisos y dinero. El resto de las reglas y prioridades permanece intacto. La consulta de cultivos vivos utiliza el índice `activeCrops`, sin recorrer el historial muerto en cada comprobación.

## Resultado

Comando de comparación: `simulateNativeCampaign({days:40,strategy:'good',seed:712,biome:'sabana',culture:'mapungubwe',reloadRaids:false})`. La traza del prototipo está en [good40-recovery-candidate-sabana712.jsonl](good40-recovery-candidate-sabana712.jsonl), SHA-256 `13e12e62e28fce89bef5ffe0a1cef4f93ec918fd5273aa32f74d5d59fe8334a4`.

Las primeras 30 filas coincidieron con el control en cultivos vivos, dinero, siembras y destrucciones; la primera diferencia fue el día 31. El prototipo sembró 6 cultivos y terminó ese día con 2 vivos, 30 monedas y el centro a 318 HP. El control no sembró, terminó con cero cultivos, 50 monedas y el centro a 252 HP. **Ambos perdieron en el día 32**, antes de alcanzar el horizonte de 40: el control con 20 monedas y el prototipo con 33; ninguno conservaba un centro operativo. El cambio mejora la respuesta local del bot, pero no prolonga la supervivencia de este escenario.

El recorrido completo se ejecutó con una primera variante que contaba cultivos mediante `s.plants.filter`; después se sustituyó esa consulta por el índice `activeCrops` para no añadir coste dependiente del historial. Esa sustitución conserva la condición lógica y sus pruebas de índice pasaron, pero la campaña completa **no se repitió con el último cambio de implementación**. También pasaron las pruebas dirigidas de finanzas y contratos de apertura. No hay evidencia suficiente para adoptar esta política.

La noche 32 destruye el centro incluso cuando se priorizan semillas. La siguiente hipótesis que merece prueba es cómo distribuir la caja entre producción, protección del centro y defensa antes de llegar a ese estado; no debe resolverse alterando el daño o concediendo recursos gratuitos.
