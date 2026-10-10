# Alternativas matemáticas, sin nuevas simulaciones

[72 combinaciones](screen.md) — [Borrador condicional de100 días](conditional-draft.md)

Este trabajo responde a la prioridad de estimar primero los100 días y descartar parámetros incoherentes antes de nuevas campañas nativas. El diagnóstico corto anterior ya terminó; no se inicia otra simulación, PR ni cambio de balance de producción.

## Qué añade el modelo v2

Se conserva íntegro el modelo/tablas originales de c9a38ac1. V2 permite bajar contratación y siembras al dinero realmente disponible en la proyección. Necesitar menos trabajadores de los deseados no se considera derrota. Las fracciones de cosecha esperada y daño esperado se acumulan, para evitar que el redondeo diario deje una finca pequeña sin cosechar perpetuamente; no introduce fracciones monetarias en el juego.

El modelo sigue siendo agregado: tener menos de30 monedas produce una advertencia/interrupción contable, no un GameOver nativo. No modela cajas pendientes, dinero recibido intradía, FIFO, agua, rutas, daños del centro ni inactividad. Reducir los ingresos no conserva por arte de magia la productividad histórica.

## Qué se ha comparado

12 factores de cosecha×3 precios de zarzas×2 reglas de presión=72 combinaciones. Centro800, inicio1500, salarios30/40 y semillas se conservan. Los precios de cosecha son enteros redondeados hacia arriba. Sólo se abaratan zarzas; los otros materiales conservan el precio de referencia.

- **Precio actual:** la amenaza utiliza los precios reducidos. También bajan alcance y probabilidad de llegar al umbral letal. No es correcto reducir ganancias en la cuenta y conservar silenciosamente toda la amenaza anterior.
- **Puntos originales por especie:** propuesta separada de mantener amenaza según pesos originales, aunque cambie el dinero cobrado. Esta regla todavía no está implementada. Las curvas de animales/alcance y el umbral60000 se conservan, ahora en esos puntos.

Las cantidades y fuerzas son esperadas, no una secuencia de RNG. Los golpes en área siguen limitados a la candidata original; no se impone el ejemplo×10. Reparación y eficacia de defensa son hipótesis.

## Punto condicional, no aceptación

Con cosechas al47,5%, zarzas3 y pesos de amenaza independientes:

- Precios propuestos: mijo16, girasol52, sorgo19, maíz25, batata33, algodón254, yuca46, plátano381.
- Con exposición de cultivos10% y productividad histórica: responsable termina100 días con526.789 monedas; sin defensas el modelo se interrumpe el día56 con4 monedas.
- Si la productividad cae20%, ambos casos se interrumpen antes del día18. Si sube20%, el caso descuidado también llega al100 con1.041 monedas.
- Con exposición30%, el responsable se interrumpe el día69. Con20% llega al100 con59.374 monedas.

**El punto es demasiado sensible para considerarlo listo.** Sobre todo, no hay evidencia de la eficacia de defensa supuesta: el piloto real previo compró428 muros y no registró impactos estructurales. Las tablas no solucionan esa carencia. Tampoco prueban actividad<25%.

El siguiente paso matemático debe buscar margen en productividad y protección; el siguiente diagnóstico nativo deberá acreditar rutas/intercepción y reparaciones útiles antes de aceptar que una estrategia es responsable. No se programan campañas100 hasta resolverlo.

## Verificación

Se comprueban conservación de caja/plantas, contratación asequible, acumulación de madurez fraccionaria, agotamiento sin duplicación, independencia de los precios frente a los pesos de presión, inmutabilidad de entradas, hashes de fuentes y200 filas de las tablas. Las filas posteriores a la interrupción se dejan desconocidas, sin inventar una partida que sigue avanzando.

Los JSON incluyen las fuentes del cálculo y todas las sensibilidades. Son reproducibles con `node tools/screen-campaign-accounting.mjs docs/qa/campaign-100-day-mathematical-projection/projection.json docs/qa/campaign-accounting-mathematical-screen`. No se importa ni ejecuta el motor del juego.
