# Sorteo nocturno y persistencia de eventos agrícolas

Pruebas `6793595`, sobre la lógica de eventos y la corrección agrícola `1090300`.
QA-127 y QA-128 verificados en simulación/persistencia; QA-126 parcial hasta
comprobar el anuncio en la interfaz real.

[97 pruebas dirigidas](qa/agricultural-events/directed.txt), cero fallos/omisiones,
3.281,5029 ms. Incluyen eventos, tareas agrícolas, cosechas/cajas, economía,
contratos, snapshots e interpolación de mensajes en inglés/español.

## Cobertura del sorteo

El fixture contiene un centro y 60 plantas pagados (20 mijo, 20 plátano,
20 girasol), con primer riego satisfecho y crecimiento preparado en el 10 %.
Tiene crédito de QA explícito y está en postcampaña para excluir ataques.
Las rutas y el terreno se doblan; no acredita navegación o rentabilidad natural.

Se buscan semillas reales del PRNG con `imul(i,2654435761)`, conservadas en el
estado, y se entra en la noche mediante `Game.tick`, sin sustituir tiradas.
Se alcanzan las 27 combinaciones legales: helada específica/global, plaga
específica y tres positivos específicos/globales, cada uno con tres intensidades.
Se comprueban intensidad, límites del porcentaje negativo y scope legal. Esta
cobertura de ramas no es una medición estadística de la distribución aleatoria.

La selección queda estable durante la noche, con una sola entrada `NightStarted`
y sin mensaje anticipado. También se comprueba una noche sin evento: avanzar
no modifica el RNG ni vuelve a sortear. Al amanecer aparece un solo aviso y
un `AgriculturalEventApplied`; no hay cargos, muertes ni derrota del fixture.

## Guardado y aplicación, QA-127

Las 27 combinaciones recorren `SaveRepository.save/load`, con almacenamiento
en memoria que implementa get/set/remove. Se compara la partida continuada
con la cargada: snapshot completo idéntico después del amanecer, mismos
destinatarios, RNG, efectos, saldo, mensajes y cola de tareas. Se prepara
expresamente tiempo 599,9 para comprobar la frontera, sin afirmar que se haya
renderizado o simulado una campaña completa.

Se verifican los efectos cuantitativos sobre cada planta y la ausencia de
modificaciones en las no seleccionadas. Las selecciones negativas contienen
exactamente `floor(elegibles × fracción)` IDs únicos, dentro de su especie/scope.
La helada resta el progreso aprobado, la plaga programa su penalización de agua,
la noche favorable cruza los checkpoints creando las deudas necesarias y los
otros positivos guardan el bonus correcto de cosecha/tolerancia.

Guardar después de aplicar y volver a invocar la aplicación no cambia ningún
byte del snapshot. Una partida cargada en la pausa de contratación tampoco
avanza ni repite el evento al recibir una petición de avance de 600 s.
No se acredita almacenamiento del navegador, navegación entre ranuras ni UI.

## Elegibilidad, QA-128

Se prueban 2.000 semillas con cuatro mijo vivos, cinco plátano vivos y girasoles
muertos. Toda selección específica elige plátano; las plantas muertas no cuentan.
Con cuatro vivos de cada especie nunca aparece un destinatario específico.
Si se sortea scope específico sin candidato, la implementación no genera evento;
no elige una especie inválida ni convierte esa tirada en un segundo sorteo.
El alcance global sigue siendo posible y se comprueba por separado.

La suite completa de CI de esta nueva cobertura todavía no se atribuye a estas
pruebas. El build/paquete de la misma lógica publicado en `1090300` permanece
documentado en [QA de riego mágico](qa-agriculture-season.md); este commit añade
pruebas sin cambiar el juego.
