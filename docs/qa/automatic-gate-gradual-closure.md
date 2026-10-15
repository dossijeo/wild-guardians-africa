# Puerta automática al cerrar un paso por tramos

En la campaña nativa Desierto/983 de la rama experimental de balance, una
política compró 22 tramos individuales. La línea oeste acabó separando el
poblado del centro: 17 trabajadores quedaron inmóviles en `fleeing`, los
nuevos permanecieron en `arriving`, no se entregaron cajas los días 7–8 y la
partida perdió por insolvencia. Ningún tramo tenía puerta. Los informes
originales y la reproducción están en
`docs/qa/evolutionary-balance/service-side-desierto983-14/` de la PR #36; esa
política fue retirada. El caso revela un defecto del motor que también puede
afectar a un jugador que construya módulo a módulo.

La detección anterior auditaba rutas si aparecía una nueva cara cerrada de
murallas o si el trazo nuevo tocaba dos murallas existentes. Una sola pieza
podía cerrar el paso contra un edificio o una barrera natural sin cumplir esas
condiciones. Ahora cada compra nativa comprueba las rutas de trabajadores y
centros que existían antes de colocarla. Si el trazo las corta, el plan de
puertas convierte un tramo nuevo en puerta practicable o deja sin construir el
tramo que no puede alojar una puerta. El coste y la orden de construcción
siguen siendo los ordinarios; no se modifica la navegación, el movimiento ni
el balance.

La regresión `tests/spatial-desert-compound-gate.test.js` usa un guardado real
con 42 trabajadores y construye cinco módulos pagados por separado. Antes
fallaba en el cuarto: algún trabajador perdía la ruta. Ahora conserva las
rutas después de cada compra, crea una puerta, mantiene el acceso tras
guardar/cargar y los 42 trabajadores avanzan físicamente al ejecutar un
tick. También siguen pasando las pruebas de puerta imposible (el módulo
queda sin construir), barreras naturales y Gran Cañón.

Validación local: 45 pruebas dirigidas, 186/186 pruebas jugables y build web.
`node tools/experiments/benchmark-gradual-wall-audit.mjs` compara el mismo
guardado Desierto/983, con 42 trabajadores y un módulo pendiente, contra
`7d257501` en orden AB/BA tras calentar ambos caminos. En una ejecución de
cuatro cotizaciones por variante, la mediana fue 8,0 ms antes y 19,1 ms después; otra
ejecución dio 9,7 y 17,9 ms, respectivamente. El sobrecoste medido está en
torno a 8–11 ms por trazo individual en este escenario. La cotización ocurre
al confirmar una compra de muralla, no durante el movimiento ni cada
fotograma. Esta evidencia no mide
la latencia de un trazo masivo en un dispositivo móvil. Las partidas ya
guardadas con trabajadores atrapados no reciben una puerta retroactiva;
la corrección protege las construcciones posteriores.
