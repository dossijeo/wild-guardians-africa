# Incursiones en el borde activo — QA-094/095

La aparición anterior utilizaba una distancia fija de 46 m al primer centro,
independiente de los chunks dibujados. Ahora `WorldScene.syncChunks` comunica
su rectángulo activo a navegación. El grupo usa un mismo lado de ese rectángulo,
con margen para los cuerpos épicos originales, separación y entradas transitables
conectadas a objetivos. Los reintentos espaciales conservan composición y sorteo
de golpes. Una región insuficiente cancela el grupo completo; no lo recorta.

El cálculo de chunks de 48 m y rangos 2/3 está compartido con el horizonte.
En ejecución sin renderer, la región inicial usa esa misma receta de calidad
media centrada en el foco de la finca. Al jugar, manda la región de la cámara.
No se persiste el rectángulo de presentación: sí los puntos de aparición de cada
animal. Mover la cámara no invalida rutas lógicas, animales ni reservas.

## Pruebas

Once pruebas nuevas: los cuatro lados en media y alta con cinco radios distintos,
incluso cuando la finca queda fuera del rectángulo; separación y cuerpos enteros
dentro del borde; seis sorteos exactos (lado + cinco presupuestos), sin rerolls;
streaming de producción con cámara desplazada sin modificar la serialización;
snapshot con presupuesto y entrada intactos; copias/validación de bounds y región
demasiado pequeña. Las ocho pruebas espaciales usan navegación controlada y un
grupo de estrés de cinco especies; no prueban su selección por presupuesto.

Las [74 pruebas dirigidas](qa/raid-border/targeted.txt) pasan, incluidas las cadenas físicas de trabajadores,
reparaciones, cajas, reloj y navegación de incursiones. La prueba de cajas avanza
ahora al siguiente amanecer desde la hora real de salida: ya no presupone que
una incursión desde el borde termine antes del anochecer.

## Navegador integrado

[Fixture](../tests/browser/raid-border.html) con WorldScene, terreno Sabana,
Mapungubwe y navegación originales, semilla 712, calidad media. Se compra el
centro con el dinero inicial. Preparación explícita de noche 21 y composición
legal de presupuesto 13: tres facóqueros y dos búfalos. Se invoca el generador
real; esto no comprueba probabilidades ni rentabilidad de una campaña.

[Aparición](qa/raid-border/spawn.json): cinco animales simultáneos, una generación,
25 chunks, rigs cargados, borde `[120,-72,360,168]`, X común 121.35 y separaciones
transitables. La menor distancia entre cuerpos es 1.06 m. Los golpes sorteados
son `[2,2,2,6,6]`. No se alteran terrenos, radios, presupuestos ni rutas.

[Cámara alejada](qa/raid-border/away.json): cambia el rectángulo a
`[1128,936,1368,1176]`; los cinco registros permanecen idénticos.
[Avance lejos](qa/raid-border/away-step.json) y
[avance cerca desde el mismo snapshot](qa/raid-border/near-step.json) producen
exactamente los mismos registros, posiciones y golpes tras 0.5 s. El animal
que reserva el único centro sigue avanzando fuera de cámara. Los otros cuatro
se retiran por no quedar objetivos libres, también con la cámara cerca: no se
confunde esa retirada lógica con desaparición por culling.

[Recarga](qa/raid-border/restored.json): restaura las cinco entradas originales
y una sola generación. [Comparación exacta](qa/raid-border/comparison.json),
[imagen final con 25 chunks](qa/raid-border/entry-restored.png) y
[consola sin errores ni warnings](qa/raid-border/console.json).
La acción inicial excedió el timeout de observación del click; se leyó su
resultado posterior sin repetirla. No se acredita mejora de tiempo de entrada.

Las dos campañas activas de cien noches (girasol y mezcla de ocho cultivos) pasan
con contratación pagada, entregas, incursiones completas y victoria única.
La suite completa sigue ejecutándose con las demás campañas; no se declara aún
que haya terminado.

[Build y paquete web](qa/raid-border/build.txt) pasan: 554 archivos, 379,678,658 bytes, 794 enlaces relativos
y 20 GLB runtime sin duplicados originales. La suite completa se registra tras
terminar. La comprobación visual cubre Sabana/Mapungubwe, no la matriz de 30 mundos.
El servidor QA 5176 y su pestaña se cerraron; 5173 permaneció intacto.
