# Contexto causal de eventos para interfaz y audio

Los eventos nuevos emitidos por `Game.emit` llevan `simulationTime` con el tiempo
confirmado de simulación de su emisión. Los eventos guardados previamente pueden
no contenerlo. No se usa el reloj real ni se reconstruye retrospectivamente el
instante a partir del snapshot que llegue más tarde.

Inventario de los consumidores directos actuales:

- Audio de acciones del mundo: colocaciones, murallas, cultivo, cosecha,
  reparación, daño, destrucción y magia. Los eventos llevan la posición aplicable
  en `presentation`, salvo los canales UI que no usan distancia. La cosecha y
  colocación de cultivos obtienen la posición en `emit`; los impactos estructurales
  conservan tanto la posición del atacante como la del objetivo y su material.
  Las grabaciones antiguas mantienen el fallback que busca la entidad.
- Audio de magia: además de su posición y tiempo, la cancelación asíncrona consulta
  deliberadamente si el objetivo y la sesión siguen activos. Esa consulta es una
  condición de vigencia del sonido, no una reconstrucción histórica.
- Interfaz: los eventos de colocación y magia llevan coordenadas; el colapso lleva
  el tipo de estructura, y Dawn el número de noches y resultado de ese momento.
  Los eventos antiguos conservan sus consultas de compatibilidad al estado.
  Los eventos de inicio/fin de incursión y campaña no requieren coordenadas.
- Indicadores de enfriamiento, ingresos y gastos y audio continuo de trabajadores
  y animales observan estado o transacciones. Las liquidaciones nuevas del
  Worker llevan identidad, cantidad exacta, tiempo y cursor causal; el HUD las
  recibe una vez tras confirmar la publicación. Forman barreras de agrupación y
  cuentan en el límite de hechos. Otros indicadores todavía no forman un
  protocolo de eventos autocontenidos. La interfaz conserva un snapshot y las publicaciones
  con eventos siguen siendo barreras: no se habilita su fusión por estos cambios.

Las pruebas de interfaz consumen los hechos después de modificar o retirar las
entidades; las de audio contrastan impactos reales de cinco especies y posición
al quitar los actores. Falta completar la proyección pequeña para HUD, separar
observaciones continuas y validar toda la entrega en una partida real; no se ha
medido coste ni se considera cerrada la arquitectura A2.
