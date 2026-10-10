# Defensa financiada con trazado alrededor de obstáculos

Candidata de política jugable del banco de simulación; no modifica navegación,
precios, daño, cantidades de animales ni colocación del juego de producción.
Se activa explícitamente con `--defense-policy routed`. `funded` conserva su
comportamiento anterior y los informes históricos permanecen intactos.

Ante una omisión del rectángulo, se buscan cuatro rutas nativas alrededor de
un núcleo de exclusión usado exclusivamente para planificar. Las esquinas se
desplazan hacia fuera como máximo seis metros; el corredor de búsqueda tiene
32 metros de margen y el resultado se limita a 256 puntos/piezas. El núcleo
no se añade al mundo, no protege cultivos y no afecta las rutas de los actores.
Se rechazan cruces y trazados que no contienen las plantas y los centros.
Cada pieza debe superar la cotización y compra nativas; se conserva el dinero
para salarios y reparaciones y se paga la construcción por tramos reales.

La alternativa de aceptar huecos cerrados por edificios o rocas requiere un
certificado completo del componente de navegación para todas las especies y
paso de trabajador. No basta una búsqueda acotada fallida. Los diagnósticos
actuales de los rectángulos omitidos no satisfacen ese criterio; se rechazan.
No se certifica como terminado un recinto que necesita actualizaciones de
puerta aún no pagadas/aplicadas.

En la copia del estado retenido del ensayo `5985791f` (día 8, tras contratación
nativa pagada de once trabajadores), el primer trazado alternativo propone
74 piezas por 740 monedas, una puerta y 14 puntos. No se compra nada: el saldo
de 259 no cubre la reserva salarial de 330. El guardado original y el estado
diagnóstico permanecen intactos. Una vista prospectiva bloquea la ruta desde
el exterior al cultivo de referencia para los cinco radios animales. Esta
comprobación no prueba todas las aproximaciones ni una incursión real.

`node --test tests/native-funded-defense-policy.test.js
tests/native-obstacle-aware-contour.test.js`: nueve pruebas aprobadas. Cubren
la cotización legal determinista, ausencia de mutación, rechazo de un recinto
abierto, ahorro sin ingresos ficticios, compras parciales reales y puerta.
El planificador es una herramienta de QA con coste de búsqueda considerable;
no se ejecuta durante los fotogramas del juego. La protección, rentabilidad e
inactividad todavía deben medirse en campañas nativas congeladas.

Pilotos posteriores conservados en
`pilot-routed-q8-good-day6-712-7` y
`pilot-maintained-routed-q8-good-day6-712-7`: la defensa intercepta golpes reales,
pero ninguna candidata satisface la inactividad inferior al 25 %. La segunda
prioriza mantenimiento nativo del perímetro pagado en vez de comprar un recinto
exterior ante daños; no limita el crecimiento agrícola ni altera producción.
