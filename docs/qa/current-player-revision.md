# Revisión solicitada por el jugador · 2026-10-04

Estas decisiones posteriores tienen prioridad sobre las tablas y comportamientos históricos del plan y los labs. Esta lista registra trabajo abierto; no acredita aceptación completa.

| Petición | Estado |
| --- | --- |
| Eliminar partidas en Continuar, incluyendo copias de recuperación | Publicado; pruebas de borrado de ranura y copias de recuperación; falta recorrido visual |
| Evitar avisos consecutivos de reserva por cada intento de planta/muralla | Publicado; falta recorrido visual |
| Corregir SFX 103 repetido sin cierre real | Se ha corregido un contexto vacío; falta escucha y recorrido completo |
| Avisos de eventos temporales, cerrables, fuera del lateral seguro | Publicado; pruebas de caducidad y cierre manual; falta prueba móvil |
| Trabajador contratado va directamente a primera tarea | Pendiente |
| Magias directas sobre terreno/cultivos sin modal ni desactivación | Primera corrección local; revisar validación del terreno |
| Multiplicar deja marcado el beneficio hasta la recogida posterior | Pendiente |
| Murallas: línea física visible al arrastrar y límite según saldo menos contratación | Revisar integración real y móvil |
| Temporizador de modos comienza con última colocación exitosa | Publicado; falta recorrido visual |
| Volver centra cámara en centro de trabajo | Publicado; falta recorrido visual |
| Jornales: ancianos 30, jóvenes 40; ajustar reserva y textos | Implementado: ancianos 30, jóvenes 40 y reserva 30; sustituye los costes anteriores |
| Manos HUD del tutorial también en segunda partida | Pendiente |
| Incursión garantizada todas las noches, nueva especie en cada una de las primeras cinco | Pendiente; revisar atracción, daño y recordatorio de escudo disponible |
| Cultivos resisten dos golpes y edificios requieren el doble de golpes | Pendiente |
| Recordatorios útiles periódicos de crecimiento y multiplicación | Pendiente |
| Campaña de 100 noches con plantación intensiva responsable y actividad constante | Pendiente; medir tiempo sin nada útil que hacer y ajustar parámetros reales si falla |
| Mala gestión debe poder causar derrota | Pendiente; añadir casos adversos representativos |
| Poblado inicial de Gran Cañón dentro del cañón en ambas riberas; trabajadores sobre el agua | Implementado; pruebas geométricas y de navegación; comprobación visual pendiente |

## Gran Cañón

El inicio nuevo distribuye unidades nativas a escala 16 en filas a ambos lados del río. Las casas más anchas se orientan longitudinalmente. Render y colisión comparten la misma transformación. El centro de trabajo y una zona cultivable conectada se validan antes de aceptar el inicio.

Cada edificio dispone de un apoyo local; el cauce conserva su altura natural. El movimiento y la posición visual de trabajadores usan la superficie del agua en este bioma. Construir en el agua continúa siendo inválido. Se conservan las posiciones de las partidas anteriores.

Evidencia: `tests/canyon-village.test.js` comprueba cinco culturas y tres semillas, cauce, alturas, tránsito, colisiones sólidas, guardado/restauración y correspondencia entre geometría visible y hull. Los tests de terreno comparan también los seis biomas con la receta original para las plataformas anteriores.

Pendiente: inspección visual renderizada del conjunto y recorrido en móvil. La lectura del navegador de pruebas sigue agotando el plazo antes de ejecutar la consulta; esto no acredita un fallo del juego ni permite certificar su aspecto visual.

## Jornales revisados

`BALANCE.workers`, perfiles de simulación y perfiles del HUD comparten los costes 30/40. La reserva de compras opcionales es el menor jornal (30); la alerta preventiva se activa en 70 (mínimo más un jornal joven). El mínimo al amanecer suma el jornal mínimo, la semilla más barata si no hay cultivos/cajas y un centro de 800 si falta uno operativo. El dinero histórico guardado no se recalcula.

Las expectativas monetarias de los tests se actualizan por la diferencia exacta de los jornales. Se conservan la exigencia de recorridos completos, la entrega física antes del cobro, el redondeo de reparaciones, la idempotencia y las comprobaciones de derrota. `tests/player-wages.test.js` comprueba precios explícitos 30/40, HUD, reserva exacta y conservación de una operación histórica de 100 al confirmar un contrato nuevo de 30.

La estrategia histórica de una planta seguida de jornadas sin trabajadores comprueba el reloj/guardado; no constituye aceptación del balance solicitado de grandes plantaciones. La estrategia histórica de 16 parcelas con cuatro jornadas iniciales sin contratación tampoco sustituye la campaña intensiva responsable pendiente en esta revisión.
