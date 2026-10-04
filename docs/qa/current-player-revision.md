# Revisión solicitada por el jugador · 2026-10-04

Estas decisiones posteriores tienen prioridad sobre las tablas y comportamientos históricos del plan y los labs. Esta lista registra trabajo abierto; no acredita aceptación completa.

| Petición | Estado |
| --- | --- |
| Eliminar partidas en Continuar, incluyendo copias de recuperación | Publicado; pruebas de borrado de ranura y copias de recuperación; falta recorrido visual |
| Evitar avisos consecutivos de reserva por cada intento de planta/muralla | Publicado; falta recorrido visual |
| Corregir SFX 103 repetido sin cierre real | Se ha corregido un contexto vacío; falta escucha y recorrido completo |
| Avisos de eventos temporales, cerrables, fuera del lateral seguro | Publicado; pruebas de caducidad y cierre manual; falta prueba móvil |
| Trabajador contratado va directamente a primera tarea | Implementado; 120 pruebas de rutas y tareas superadas; recorrido visual pendiente |
| Magias directas sobre terreno/cultivos sin modal ni desactivación | Se admiten puntos finitos sin exigir terreno edificable; interacción visual pendiente |
| Multiplicar deja marcado el beneficio hasta la recogida posterior | Implementado; pruebas de recogida y entrega tras caducidad y restauración |
| Murallas: línea física visible al arrastrar y límite según saldo menos contratación | Revisar integración real y móvil |
| Temporizador de modos comienza con última colocación exitosa | Publicado; falta recorrido visual |
| Volver centra cámara en centro de trabajo | Publicado; falta recorrido visual |
| Jornales: ancianos 30, jóvenes 40; ajustar reserva y textos | Implementado: ancianos 30, jóvenes 40 y reserva 30; sustituye los costes anteriores |
| Manos HUD del tutorial también en segunda partida | Pendiente |
| Incursión garantizada todas las noches, nueva especie en cada una de las primeras cinco | Implementado; umbrales de atracción reducidos, presentaciones con un golpe; recordatorio de escudo pendiente |
| Cultivos resisten dos golpes y edificios requieren el doble de golpes | Implementado: daño persistente en cultivos y mitad de daño estructural por golpe |
| Recordatorios útiles periódicos de crecimiento y multiplicación | Pendiente |
| Campaña de 100 noches con plantación intensiva responsable y actividad constante | Pendiente; medir tiempo sin nada útil que hacer y ajustar parámetros reales si falla |
| Mala gestión debe poder causar derrota | Pendiente; añadir casos adversos representativos |
| Poblado inicial de Gran Cañón dentro del cañón en ambas riberas; trabajadores sobre el agua | Implementado; pruebas geométricas y de navegación; comprobación visual pendiente |

## Gran Cañón

El inicio nuevo distribuye unidades nativas a escala 16 en filas a ambos lados del río. Las casas más anchas se orientan longitudinalmente. Render y colisión comparten la misma transformación. El centro de trabajo y una zona cultivable conectada se validan antes de aceptar el inicio.

Cada edificio dispone de un apoyo local; el cauce conserva su altura natural. El movimiento y la posición visual de trabajadores usan la superficie del agua en este bioma. Construir en el agua continúa siendo inválido. Se conservan las posiciones de las partidas anteriores.

Evidencia: `tests/canyon-village.test.js` comprueba cinco culturas y tres semillas, cauce, alturas, tránsito, colisiones sólidas, guardado/restauración y correspondencia entre geometría visible y hull. Los tests de terreno comparan también los seis biomas con la receta original para las plataformas anteriores.

Pendiente: inspección visual renderizada del conjunto y recorrido en móvil. El acceso al navegador se ha recuperado y se ha comprobado con una captura del menú; la vista del cañón todavía requiere inspección específica.

## Jornales revisados

`BALANCE.workers`, perfiles de simulación y perfiles del HUD comparten los costes 30/40. La reserva de compras opcionales es el menor jornal (30); la alerta preventiva se activa en 70 (mínimo más un jornal joven). El mínimo al amanecer suma el jornal mínimo, la semilla más barata si no hay cultivos/cajas y un centro de 800 si falta uno operativo. El dinero histórico guardado no se recalcula.

Las expectativas monetarias de los tests se actualizan por la diferencia exacta de los jornales. Se conservan la exigencia de recorridos completos, la entrega física antes del cobro, el redondeo de reparaciones, la idempotencia y las comprobaciones de derrota. `tests/player-wages.test.js` comprueba precios explícitos 30/40, HUD, reserva exacta y conservación de una operación histórica de 100 al confirmar un contrato nuevo de 30.

La estrategia histórica de una planta seguida de jornadas sin trabajadores comprueba el reloj/guardado; no constituye aceptación del balance solicitado de grandes plantaciones. La estrategia histórica de 16 parcelas con cuatro jornadas iniciales sin contratación tampoco sustituye la campaña intensiva responsable pendiente en esta revisión.

## Primera tarea de la jornada

Los contratos nuevos reservan la primera tarea FIFO alcanzable desde su posición real antes de iniciar el desplazamiento. Sin tareas disponibles conservan su aproximación al centro; quienes regresan de una incursión mantienen su vuelta deliberada. Las pruebas incluyen restauración de partida, desplazamiento continuo, riego, cajas y entrega física antes del cobro.

## Multiplicación persistente

Al lanzar Multiplicar se marcan los cultivos vivos alcanzados; los brotes colocados dentro durante los 15 segundos también quedan marcados. El beneficio no se acumula con otros lanzamientos y se consume en la recogida, incorporado al valor de la caja. Caducar, guardar o restaurar no elimina el beneficio. No se abonan monedas hasta completar el transporte y la entrega. Se conserva la compatibilidad con áreas activas antiguas mediante una inicialización única, sin recorrer cultivos por esta magia en cada paso.

## Bloqueo de ruta en la noche 38

La batería completa tras la salida directa de trabajadores detectó dos facóqueros detenidos mutuamente. Se ha reproducido en el terreno real Sabana/712: se encontraba un punto posterior libre pero se conservaba un waypoint anterior ocupado. La corrección incorpora el tramo de reincorporación solo si respeta obstáculos estáticos y separación entre actores. La regresión grabada exige llegada de ambos, límite de velocidad y validez de cada segmento. Una reproducción adicional del guardado completo bloqueado acaba la incursión y llega al amanecer del día 39 con contratación pendiente. La campaña completa con esta corrección todavía debe ejecutarse; no se aumenta su límite ni se sustituye la aceptación intensiva pendiente.

## Incursiones garantizadas y daño

Todas las noches de campaña tienen un grupo de al menos un animal, incluso sin cultivos. Las cinco primeras presentan facóquero, hiena, búfalo, león y rinoceronte, uno por noche con un golpe disponible. Después se utilizan composiciones aleatorias legales con umbrales de atracción 0/100/300/800/2000 y probabilidad nocturna 100 %. Las incursiones diurnas mantienen su condición y probabilidad; tras liberar la campaña no hay ataques.

Los cultivos acumulan un golpe sin morir y se destruyen al segundo; el daño se guarda y se valida al restaurar. Daños estructurales por especie: 20/25/35/40/60. Las pruebas conservan animaciones completas, presupuesto de golpes, reservas exclusivas y separación de cuerpos. Se han probado las cinco especies en las seis entradas de bioma reales cerca de cámara o finca. Falta la aceptación del balance con grandes plantaciones y el recordatorio de escudo en cada incursión.

## Petición adicional: cámara de incursión

Pendiente: viaje suave hacia el primer animal cuando entra en la finca, una vez por incursión, interrumpible mediante control manual de la cámara.
