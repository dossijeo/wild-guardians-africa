# Revisión solicitada por el jugador · 2026-10-04

Estas decisiones posteriores tienen prioridad sobre las tablas y comportamientos históricos del plan y los labs. Esta lista registra trabajo abierto; no acredita aceptación completa.

| Petición | Estado |
| --- | --- |
| Eliminar partidas en Continuar, incluyendo copias de recuperación | Implementación local en curso; falta cobertura y publicación |
| Evitar avisos consecutivos de reserva por cada intento de planta/muralla | Implementación local en curso |
| Corregir SFX 103 repetido sin cierre real | Se ha corregido un contexto vacío; falta escucha y recorrido completo |
| Avisos de eventos temporales, cerrables, fuera del lateral seguro | Implementación local en curso; falta prueba móvil |
| Trabajador contratado va directamente a primera tarea | Pendiente |
| Magias directas sobre terreno/cultivos sin modal ni desactivación | Primera corrección local; revisar validación del terreno |
| Multiplicar deja marcado el beneficio hasta la recogida posterior | Pendiente |
| Murallas: línea física visible al arrastrar y límite según saldo menos contratación | Revisar integración real y móvil |
| Temporizador de modos comienza con última colocación exitosa | Implementación local en curso |
| Volver centra cámara en centro de trabajo | Implementación local en curso |
| Jornales: ancianos 30, jóvenes 40; ajustar reserva y textos | Pendiente; sustituye los costes anteriores |
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
